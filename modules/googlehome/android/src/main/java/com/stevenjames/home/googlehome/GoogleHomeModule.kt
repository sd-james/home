package com.stevenjames.home.googlehome

import com.google.android.gms.common.ConnectionResult
import com.google.android.gms.common.GoogleApiAvailability
import com.google.home.ForcePermissionFlow
import com.google.home.HomeDevice
import com.google.home.PermissionsResultStatus
import com.google.home.PermissionsState
import com.google.home.matter.standard.OnOff
import expo.modules.kotlin.exception.CodedException
import expo.modules.kotlin.functions.Coroutine
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import kotlinx.coroutines.flow.first

class GoogleHomeException(code: String, message: String, cause: Throwable? = null) :
  CodedException(code, message, cause)

/**
 * Google Home APIs for JS: permission (consent) state and request, the
 * devices that can switch on/off with their rooms, and on/off commands.
 */
class GoogleHomeModule : Module() {
  private val context
    get() = requireNotNull(appContext.reactContext) { "React context is not available" }

  private val client
    get() = GoogleHome.client(context)

  override fun definition() = ModuleDefinition {
    Name("GoogleHome")

    /** Whether Google Play services is present and usable. */
    Function("isAvailable") {
      GoogleApiAvailability.getInstance().isGooglePlayServicesAvailable(context) == ConnectionResult.SUCCESS
    }

    /** "granted" | "not_granted" | "unavailable" */
    AsyncFunction("getPermissionState") Coroutine { ->
      val state = client.hasPermissions().first { it != PermissionsState.PERMISSIONS_STATE_UNINITIALIZED }
      when (state) {
        PermissionsState.GRANTED -> "granted"
        PermissionsState.NOT_GRANTED -> "not_granted"
        else -> "unavailable"
      }
    }

    /** Shows Google's consent screen. `force` re-opens it to change the home or devices. */
    AsyncFunction("requestPermissions") Coroutine { force: Boolean ->
      val result = try {
        client.requestPermissions(
          forcePermissionFlow = if (force) ForcePermissionFlow.FORCE_LAUNCH else ForcePermissionFlow.DO_NOT_FORCE_LAUNCH
        )
      } catch (e: Exception) {
        throw GoogleHomeException("ERR_GOOGLE_HOME_PERMISSIONS", e.message ?: "Couldn't open Google Home permissions", e)
      }
      when (result.status) {
        PermissionsResultStatus.SUCCESS -> "granted"
        PermissionsResultStatus.CANCELLED -> "cancelled"
        else -> throw GoogleHomeException(
          "ERR_GOOGLE_HOME_PERMISSIONS",
          result.errorMessage ?: "Google Home permission failed"
        )
      }
    }

    /** Devices that support on/off, with room names and current state. */
    AsyncFunction("listDevices") Coroutine { ->
      try {
        val rooms = client.rooms().list().associate { it.id.id to it.name }
        val structures = client.structures().list().associate { it.id.id to it.name }
        client.devices().list()
          .filter { it.has(OnOff) }
          .map { device ->
            mapOf(
              "id" to device.id.id,
              "name" to device.name,
              "room" to (device.roomId?.let { rooms[it.id] } ?: ""),
              "home" to (structures[device.structureId?.id] ?: ""),
              "on" to readOnOff(device),
            )
          }
          .sortedWith(compareBy({ it["room"] as String }, { it["name"] as String }))
      } catch (e: Exception) {
        throw GoogleHomeException("ERR_GOOGLE_HOME_DEVICES", e.message ?: "Couldn't list Google Home devices", e)
      }
    }

    /** Switches a device on or off. */
    AsyncFunction("setOnOff") Coroutine { deviceId: String, on: Boolean ->
      val device = client.devices().list().firstOrNull { it.id.id == deviceId }
        ?: throw GoogleHomeException("ERR_GOOGLE_HOME_DEVICE", "Device not found")
      val trait = onOffTrait(device)
        ?: throw GoogleHomeException("ERR_GOOGLE_HOME_DEVICE", "${device.name} can't be switched on or off")
      try {
        if (on) trait.on() else trait.off()
      } catch (e: Exception) {
        throw GoogleHomeException("ERR_GOOGLE_HOME_COMMAND", e.message ?: "${device.name} didn't respond", e)
      }
    }
  }

  private suspend fun onOffTrait(device: HomeDevice): OnOff? =
    device.types().first().firstNotNullOfOrNull { it.trait(OnOff) }

  private suspend fun readOnOff(device: HomeDevice): Boolean? =
    try {
      onOffTrait(device)?.onOff
    } catch (e: Exception) {
      null
    }
}
