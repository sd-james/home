package com.stevenjames.home.googlehome

import android.app.Activity
import android.content.Context
import android.os.Bundle
import android.util.Log
import androidx.activity.result.ActivityResultCaller
import expo.modules.core.interfaces.Package
import expo.modules.core.interfaces.ReactActivityLifecycleListener

/** Hooks the main activity's onCreate so Google's consent screen can be shown later. */
class GoogleHomePackage : Package {
  override fun createReactActivityLifecycleListeners(activityContext: Context?): List<ReactActivityLifecycleListener> =
    listOf(object : ReactActivityLifecycleListener {
      override fun onCreate(activity: Activity, savedInstanceState: Bundle?) {
        val caller = activity as? ActivityResultCaller ?: return
        try {
          GoogleHome.registerActivity(activity, caller)
        } catch (e: Exception) {
          Log.w("GoogleHome", "Couldn't set up Google Home permissions", e)
        }
      }
    })
}
