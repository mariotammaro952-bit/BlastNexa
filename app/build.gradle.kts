plugins { id("com.android.application") }

android {
    namespace = "com.blastnexa.blockpuzzle"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.blastnexa.blockpuzzle"
        minSdk = 24
        targetSdk = 36
        versionCode = 14
        versionName = "1.0.0-beta4-war-ocean-test"
        buildConfigField("boolean", "LIVE_ADS", "false")
    }

    val keyPath = System.getenv("BN_KEYSTORE_PATH")
    if (!keyPath.isNullOrBlank()) {
        signingConfigs {
            create("upload") {
                storeFile = file(keyPath)
                storePassword = System.getenv("BN_STORE_PASSWORD") ?: ""
                keyAlias = System.getenv("BN_KEY_ALIAS") ?: ""
                keyPassword = System.getenv("BN_KEY_PASSWORD") ?: ""
            }
        }
    }

    buildTypes {
        getByName("release") {
            isMinifyEnabled = false
            if (!keyPath.isNullOrBlank()) {
                signingConfig = signingConfigs.getByName("upload")
            }
        }
    }
    buildFeatures { buildConfig = true }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}

dependencies {
    implementation("com.google.android.libraries.ads.mobile.sdk:ads-mobile-sdk:1.5.0")
    implementation("com.google.android.ump:user-messaging-platform:4.0.0")
}
