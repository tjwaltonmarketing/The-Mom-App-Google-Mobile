# Capacitor and WebView specific ProGuard rules
-keep class com.getcapacitor.** { *; }
-keep class com.capacitorjs.** { *; }
-keep interface com.getcapacitor.** { *; }

# Keep WebView JavaScript interface
-keepclassmembers class * {
    @android.webkit.JavascriptInterface <methods>;
}

# Keep WebView classes
-keep class android.webkit.** { *; }

# Keep attributes for debugging
-keepattributes SourceFile,LineNumberTable
-renamesourcefileattribute SourceFile

# Keep native methods
-keepclasseswithmembernames class * {
    native <methods>;
}

# Keep classes that might be referenced by WebView
-keep class **.R$* { *; }

# Firebase Cloud Messaging - required for push notifications
-keep class com.google.firebase.** { *; }
-keep class com.google.android.gms.** { *; }
-dontwarn com.google.firebase.**
-dontwarn com.google.android.gms.**

# Firebase Messaging specific
-keep class com.google.firebase.messaging.** { *; }
-keep class com.google.firebase.iid.** { *; }
-keep class com.google.firebase.installations.** { *; }

# Capacitor Push Notifications plugin
-keep class com.capacitorjs.plugins.pushnotifications.** { *; }
