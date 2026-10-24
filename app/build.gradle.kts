plugins { id("com.android.application") }

android {
    namespace = "com.blastnexa.blockpuzzle"
    compileSdk = 36
    defaultConfig {
        applicationId = "com.blastnexa.blockpuzzle"
        minSdk = 24
        targetSdk = 36
        versionCode = 2801
        versionName = "1.0.0-v28"
        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
    }

    flavorDimensions += "environment"
    productFlavors {
        create("preview") {
            dimension = "environment"
            applicationIdSuffix = ".preview"
            versionNameSuffix = "-test"
            buildConfigField("String", "AD_APP_ID", "\"ca-app-pub-3940256099942544~3347511713\"")
            buildConfigField("String", "BANNER_AD_UNIT", "\"ca-app-pub-3940256099942544/6300978111\"")
            buildConfigField("String", "INTERSTITIAL_AD_UNIT", "\"ca-app-pub-3940256099942544/1033173712\"")
            buildConfigField("String", "REWARDED_AD_UNIT", "\"ca-app-pub-3940256099942544/5224354917\"")
            manifestPlaceholders["adMobAppId"] = "ca-app-pub-3940256099942544~3347511713"
        }
        create("production") {
            dimension = "environment"
            val banner = System.getenv("BN_BANNER_AD_UNIT") ?: ""
            require(banner.isEmpty() || banner.matches(Regex("ca-app-pub-7428534984744854/[0-9]{10}"))) { "Invalid BlastNexa banner ad unit" }
            buildConfigField("String", "AD_APP_ID", "\"ca-app-pub-7428534984744854~6791579488\"")
            buildConfigField("String", "BANNER_AD_UNIT", "\"$banner\"")
            buildConfigField("String", "INTERSTITIAL_AD_UNIT", "\"ca-app-pub-7428534984744854/2281488833\"")
            buildConfigField("String", "REWARDED_AD_UNIT", "\"ca-app-pub-7428534984744854/7070781083\"")
            manifestPlaceholders["adMobAppId"] = "ca-app-pub-7428534984744854~6791579488"
        }
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
    buildFeatures { buildConfig = true }
    testOptions { animationsDisabled = true }
}

dependencies {
    implementation("com.google.android.libraries.ads.mobile.sdk:ads-mobile-sdk:1.5.0")
    implementation("com.google.android.ump:user-messaging-platform:4.0.0")
    androidTestImplementation("androidx.test:runner:1.6.2")
    androidTestImplementation("androidx.test:rules:1.6.1")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test.uiautomator:uiautomator:2.3.0")
}
