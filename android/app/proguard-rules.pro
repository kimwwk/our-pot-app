# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.
#
# For more details, see
#   http://developer.android.com/guide/developing/tools/proguard.html

# Capacitor uses WebView with JS bridge
-keep class com.getcapacitor.** { *; }
-keep class com.getcapacitor.community.** { *; }
-keep class com.ourpot.app.** { *; }
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# SQLite / encryption dependencies
-keep class net.zetetic.** { *; }
-keep class com.google.crypto.tink.** { *; }

# Google Tink / ErrorProne annotations (used by Capacitor SQLite encryption)
-dontwarn com.google.errorprone.annotations.**
-dontwarn javax.annotation.**
-dontwarn com.google.api.client.http.**

# Uncomment this to preserve the line number information for
# debugging stack traces.
#-keepattributes SourceFile,LineNumberTable

# If you keep the line number information, uncomment this to
# hide the original source file name.
#-renamesourcefileattribute SourceFile
