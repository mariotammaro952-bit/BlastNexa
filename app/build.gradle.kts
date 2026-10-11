plugins { id("com.android.application") }

android {
    namespace = "com.blastnexa.blockpuzzle"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.blastnexa.blockpuzzle"
        minSdk = 24
        targetSdk = 36
        versionCode = 12
        versionName = "1.0.0-beta2"
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
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
}
