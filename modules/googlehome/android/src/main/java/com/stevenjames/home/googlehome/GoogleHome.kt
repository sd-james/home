package com.stevenjames.home.googlehome

import android.content.Context
import androidx.activity.result.ActivityResultCaller
import com.google.home.FactoryRegistry
import com.google.home.Home
import com.google.home.HomeClient
import com.google.home.HomeConfig
import com.google.home.matter.standard.ColorTemperatureLightDevice
import com.google.home.matter.standard.DimmableLightDevice
import com.google.home.matter.standard.DimmablePlugInUnitDevice
import com.google.home.matter.standard.ExtendedColorLightDevice
import com.google.home.matter.standard.OnOff
import com.google.home.matter.standard.OnOffLightDevice
import com.google.home.matter.standard.OnOffLightSwitchDevice
import com.google.home.matter.standard.OnOffPluginUnitDevice
import kotlinx.coroutines.Dispatchers

/**
 * The single Google Home client for the app. Created with the application
 * context; the main activity registers itself for the consent screen in
 * [GoogleHomePackage] before it starts.
 */
object GoogleHome {
  /** Device types and traits the app can see. Others are invisible to the APIs. */
  private val registry = FactoryRegistry(
    traits = listOf(OnOff),
    types = listOf(
      OnOffPluginUnitDevice,
      DimmablePlugInUnitDevice,
      OnOffLightDevice,
      DimmableLightDevice,
      ColorTemperatureLightDevice,
      ExtendedColorLightDevice,
      OnOffLightSwitchDevice,
    )
  )

  @Volatile private var client: HomeClient? = null

  fun client(context: Context): HomeClient =
    client ?: synchronized(this) {
      client ?: Home.getClient(
        context.applicationContext,
        HomeConfig(coroutineContext = Dispatchers.IO, factoryRegistry = registry)
      ).also { client = it }
    }

  /** Must run in the activity's onCreate (before it is STARTED). */
  fun registerActivity(context: Context, caller: ActivityResultCaller) {
    client(context).registerActivityResultCallerForPermissions(caller)
  }
}
