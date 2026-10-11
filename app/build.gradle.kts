plugins { id("com.android.application") }

android {
    namespace = "com.blastnexa.blockpuzzle"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.blastnexa.blockpuzzle"
        minSdk = 23
        targetSdk = 36
        versionCode = 10
        versionName = "0.9.1"
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
