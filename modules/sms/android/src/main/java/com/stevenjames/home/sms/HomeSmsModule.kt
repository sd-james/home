package com.stevenjames.home.sms

import android.Manifest
import android.app.Activity
import android.app.PendingIntent
import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.content.IntentFilter
import android.content.pm.PackageManager
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.provider.Telephony
import android.telephony.SmsManager
import expo.modules.kotlin.Promise
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.util.concurrent.atomic.AtomicInteger

private const val SMS_RECEIVED_EVENT = "onSmsReceived"
private const val SENT_ACTION = "com.stevenjames.home.sms.SENT"
private const val SENT_CONFIRM_TIMEOUT_MS = 30_000L

class SmsPermissionException(permission: String) :
  CodedException("ERR_SMS_PERMISSION", "Permission $permission has not been granted", null)

class SmsSendException(message: String) :
  CodedException("ERR_SMS_SEND", message, null)

/**
 * Sends SMS directly, reports incoming SMS while JS listens, and reads the
 * inbox. Permissions are requested from JS; every call checks them here.
 */
class HomeSmsModule : Module() {
  private val context: Context
    get() = requireNotNull(appContext.reactContext) { "React context is not available" }

  private var incomingReceiver: BroadcastReceiver? = null
  private val requestCodes = AtomicInteger(0)

  override fun definition() = ModuleDefinition {
    Name("HomeSms")

    Events(SMS_RECEIVED_EVENT)

    OnStartObserving(SMS_RECEIVED_EVENT) { startListening() }
    OnStopObserving(SMS_RECEIVED_EVENT) { stopListening() }
    OnDestroy { stopListening() }

    /** Whether this device can send SMS at all (false on Wi-Fi-only tablets). */
    Function("canSendSms") {
      val feature = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        PackageManager.FEATURE_TELEPHONY_MESSAGING
      } else {
        PackageManager.FEATURE_TELEPHONY
      }
      context.packageManager.hasSystemFeature(feature)
    }

    /**
     * Sends a text straight away. Resolves "sent" when the network accepts it,
     * or "unconfirmed" when no confirmation arrives within 30 seconds.
     */
    AsyncFunction("sendSms") { to: String, body: String, promise: Promise ->
      requirePermission(Manifest.permission.SEND_SMS)
      sendSms(to, body, promise)
    }

    /** Inbox messages received at or after `sinceMs`, newest first. */
    AsyncFunction("readInbox") { sinceMs: Double, limit: Int ->
      requirePermission(Manifest.permission.READ_SMS)
      readInbox(sinceMs.toLong(), limit)
    }
  }

  private fun requirePermission(permission: String) {
    if (context.checkSelfPermission(permission) != PackageManager.PERMISSION_GRANTED) {
      throw SmsPermissionException(permission)
    }
  }

  private fun smsManager(): SmsManager =
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.S) {
      context.getSystemService(SmsManager::class.java)
    } else {
      @Suppress("DEPRECATION")
      SmsManager.getDefault()
    }

  private fun sendSms(to: String, body: String, promise: Promise) {
    val manager = smsManager()
    val parts = manager.divideMessage(body)
    val action = "$SENT_ACTION.${requestCodes.incrementAndGet()}"
    val handler = Handler(Looper.getMainLooper())
    var remaining = parts.size
    var settled = false

    lateinit var receiver: BroadcastReceiver
    fun settle(block: () -> Unit) {
      if (settled) return
      settled = true
      handler.removeCallbacksAndMessages(null)
      runCatching { context.unregisterReceiver(receiver) }
      block()
    }

    receiver = object : BroadcastReceiver() {
      override fun onReceive(ctx: Context, intent: Intent) {
        if (resultCode != Activity.RESULT_OK) {
          settle { promise.reject(SmsSendException("The SMS couldn't be sent (${describeError(resultCode)}).")) }
          return
        }
        remaining -= 1
        if (remaining <= 0) settle { promise.resolve("sent") }
      }
    }
    registerReceiverCompat(receiver, IntentFilter(action), exported = false, permission = null)
    handler.postDelayed({ settle { promise.resolve("unconfirmed") } }, SENT_CONFIRM_TIMEOUT_MS)

    val sentIntents = ArrayList(
      parts.indices.map { index ->
        PendingIntent.getBroadcast(
          context,
          requestCodes.incrementAndGet(),
          Intent(action).setPackage(context.packageName).putExtra("part", index),
          PendingIntent.FLAG_ONE_SHOT or PendingIntent.FLAG_IMMUTABLE
        )
      }
    )

    try {
      if (parts.size > 1) {
        manager.sendMultipartTextMessage(to, null, parts, sentIntents, null)
      } else {
        manager.sendTextMessage(to, null, body, sentIntents.first(), null)
      }
    } catch (e: Exception) {
      settle { promise.reject(SmsSendException("The SMS couldn't be sent: ${e.message}")) }
    }
  }

  private fun describeError(code: Int): String = when (code) {
    SmsManager.RESULT_ERROR_GENERIC_FAILURE -> "generic failure"
    SmsManager.RESULT_ERROR_NO_SERVICE -> "no mobile service"
    SmsManager.RESULT_ERROR_NULL_PDU -> "empty message"
    SmsManager.RESULT_ERROR_RADIO_OFF -> "airplane mode or radio off"
    else -> "error $code"
  }

  private fun readInbox(sinceMs: Long, limit: Int): List<Map<String, Any?>> {
    val messages = mutableListOf<Map<String, Any?>>()
    context.contentResolver.query(
      Telephony.Sms.Inbox.CONTENT_URI,
      arrayOf(Telephony.Sms.ADDRESS, Telephony.Sms.BODY, Telephony.Sms.DATE),
      "${Telephony.Sms.DATE} >= ?",
      arrayOf(sinceMs.toString()),
      "${Telephony.Sms.DATE} DESC"
    )?.use { cursor ->
      val address = cursor.getColumnIndexOrThrow(Telephony.Sms.ADDRESS)
      val body = cursor.getColumnIndexOrThrow(Telephony.Sms.BODY)
      val date = cursor.getColumnIndexOrThrow(Telephony.Sms.DATE)
      while (cursor.moveToNext() && messages.size < limit) {
        messages.add(
          mapOf(
            "from" to (cursor.getString(address) ?: ""),
            "body" to (cursor.getString(body) ?: ""),
            "timestamp" to cursor.getLong(date).toDouble()
          )
        )
      }
    }
    return messages
  }

  /**
   * Runs when JS adds the first listener. RECEIVE_SMS must already be granted,
   * so JS asks for permissions before subscribing.
   */
  private fun startListening() {
    if (incomingReceiver != null) return
    if (context.checkSelfPermission(Manifest.permission.RECEIVE_SMS) != PackageManager.PERMISSION_GRANTED) {
      return
    }
    val receiver = object : BroadcastReceiver() {
      override fun onReceive(ctx: Context, intent: Intent) {
        if (intent.action != Telephony.Sms.Intents.SMS_RECEIVED_ACTION) return
        val parts = Telephony.Sms.Intents.getMessagesFromIntent(intent) ?: return
        // A long SMS arrives as several parts; join them per sender.
        parts.filterNotNull()
          .groupBy { it.displayOriginatingAddress ?: "" }
          .forEach { (from, messages) ->
            sendEvent(
              SMS_RECEIVED_EVENT,
              mapOf(
                "from" to from,
                "body" to messages.joinToString("") { it.displayMessageBody ?: "" },
                "timestamp" to (messages.firstOrNull()?.timestampMillis ?: System.currentTimeMillis()).toDouble()
              )
            )
          }
      }
    }
    registerReceiverCompat(
      receiver,
      IntentFilter(Telephony.Sms.Intents.SMS_RECEIVED_ACTION),
      exported = true,
      permission = Manifest.permission.BROADCAST_SMS
    )
    incomingReceiver = receiver
  }

  private fun stopListening() {
    incomingReceiver?.let { runCatching { context.unregisterReceiver(it) } }
    incomingReceiver = null
  }

  private fun registerReceiverCompat(
    receiver: BroadcastReceiver,
    filter: IntentFilter,
    exported: Boolean,
    permission: String?
  ) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
      val flag = if (exported) Context.RECEIVER_EXPORTED else Context.RECEIVER_NOT_EXPORTED
      context.registerReceiver(receiver, filter, permission, null, flag)
    } else {
      context.registerReceiver(receiver, filter, permission, null)
    }
  }
}
