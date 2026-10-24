package com.blastnexa.blockpuzzle;

import android.Manifest;
import android.app.AlarmManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.content.pm.PackageManager;
import android.graphics.BitmapFactory;
import android.graphics.Color;
import android.os.Build;
import android.util.Log;
import java.text.SimpleDateFormat;
import java.util.Calendar;
import java.util.Locale;

/** Three automatic local invitations. Android owns notification permission. */
final class OdysseyReminders {
    static final String CHANNEL = "nexa_play_invites";
    static final String PREFS = "nexa_automatic_invites_v27";
    static final String ACTION = "com.blastnexa.blockpuzzle.PLAY_INVITATION";
    static final String EXTRA_SLOT = "invite_slot", EXTRA_DAY = "invite_day";
    static final int BASE_ID = 7900;
    static final int[] HOURS = {9,14,20}, MINUTES = {0,0,30};
    static final String[] TITLES = {"Il tuo momento Nexa", "Una pausa, una nuova combinazione", "La tua sfida della sera"};
    static final String[] COPIES = {
        "100 monete ogni giorno. Accendi la tua avventura su BlastNexa!",
        "Blocchi, combo e nuovi obiettivi: torna a giocare su BlastNexa.",
        "Puzzle e mondi da esplorare: scegli la tua prossima partita."
    };
    private OdysseyReminders() {}

    static SharedPreferences preferences(Context context) {
        return context.getSharedPreferences(PREFS,Context.MODE_PRIVATE);
    }
    static String dayKey(long timestamp) {
        return new SimpleDateFormat("yyyy-MM-dd",Locale.ROOT).format(timestamp);
    }
    static long nextTrigger(Calendar now,int slot) {
        if(slot<0 || slot>=HOURS.length)throw new IllegalArgumentException("Invalid invite slot");
        Calendar target=(Calendar)now.clone();
        target.set(Calendar.HOUR_OF_DAY,HOURS[slot]);target.set(Calendar.MINUTE,MINUTES[slot]);
        target.set(Calendar.SECOND,0);target.set(Calendar.MILLISECOND,0);
        if(!target.after(now))target.add(Calendar.DAY_OF_MONTH,1);
        return target.getTimeInMillis();
    }
    static void createChannel(Context context) {
        if(Build.VERSION.SDK_INT<26)return;
        NotificationManager manager=context.getSystemService(NotificationManager.class);
        if(manager==null)return;
        NotificationChannel channel=new NotificationChannel(CHANNEL,"Inviti a giocare",NotificationManager.IMPORTANCE_DEFAULT);
        channel.setDescription("Inviti automatici: mattina, primo pomeriggio e sera.");
        channel.enableVibration(false);
        manager.createNotificationChannel(channel);
    }
    static void scheduleAll(Context context) {
        createChannel(context);
        Calendar now=Calendar.getInstance();
        for(int slot=0;slot<HOURS.length;slot++)scheduleSlot(context,slot,now);
    }
    static void scheduleSlot(Context context,int slot,Calendar now) {
        AlarmManager alarms=context.getSystemService(AlarmManager.class);if(alarms==null)return;
        long trigger=nextTrigger(now,slot);
        Intent intent=new Intent(context,OdysseyReminderReceiver.class).setAction(ACTION)
            .putExtra(EXTRA_SLOT,slot).putExtra(EXTRA_DAY,dayKey(trigger));
        PendingIntent pending=PendingIntent.getBroadcast(context,BASE_ID+slot,intent,
            PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        try {
            // Inexact local reminders respect Android battery management and
            // do not require the special exact-alarm permission.
            alarms.setAndAllowWhileIdle(AlarmManager.RTC_WAKEUP,trigger,pending);
            preferences(context).edit().putLong("next_"+slot,trigger).apply();
        } catch(RuntimeException error) {
            Log.w("BlastNexa-Invites","Could not schedule invitation "+slot,error);
        }
    }
    static synchronized boolean deliver(Context context,int slot,String expectedDay,long now) {
        if(slot<0 || slot>=HOURS.length)return false;
        String today=dayKey(now);
        if(!today.equals(expectedDay))return false;
        Calendar calendar=Calendar.getInstance();calendar.setTimeInMillis(now);
        int minute=calendar.get(Calendar.HOUR_OF_DAY)*60+calendar.get(Calendar.MINUTE);
        int starts=HOURS[slot]*60+MINUTES[slot];
        int ends=slot+1<HOURS.length?HOURS[slot+1]*60+MINUTES[slot+1]:24*60;
        // A late alarm cannot replay yesterday's invite or create a burst
        // of morning and afternoon invites in the same time window.
        if(minute<starts || minute>=ends)return false;
        SharedPreferences prefs=preferences(context);
        if(prefs.getString("last_"+slot,"").compareTo(today)>=0)return false;
        if(Build.VERSION.SDK_INT>=33 && context.checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)!=PackageManager.PERMISSION_GRANTED)return false;
        NotificationManager manager=context.getSystemService(NotificationManager.class);
        if(manager==null || !manager.areNotificationsEnabled())return false;
        createChannel(context);
        if(Build.VERSION.SDK_INT>=26 && manager.getNotificationChannel(CHANNEL).getImportance()==NotificationManager.IMPORTANCE_NONE)return false;
        Intent launch=new Intent(context,OdysseyActivity.class).addFlags(Intent.FLAG_ACTIVITY_CLEAR_TOP|Intent.FLAG_ACTIVITY_SINGLE_TOP);
        PendingIntent content=PendingIntent.getActivity(context,BASE_ID+slot,launch,
            PendingIntent.FLAG_UPDATE_CURRENT|PendingIntent.FLAG_IMMUTABLE);
        Notification.Builder builder=Build.VERSION.SDK_INT>=26?new Notification.Builder(context,CHANNEL):new Notification.Builder(context);
        builder.setSmallIcon(R.drawable.ic_stat_nexa)
            .setLargeIcon(BitmapFactory.decodeResource(context.getResources(),R.drawable.ic_launcher_foreground))
            .setColor(Color.rgb(155,255,70)).setContentTitle(TITLES[slot]).setContentText(COPIES[slot])
            .setStyle(new Notification.BigTextStyle().bigText(COPIES[slot]))
            .setContentIntent(content).setAutoCancel(true).setOnlyAlertOnce(true)
            .setCategory(Notification.CATEGORY_REMINDER).setVisibility(Notification.VISIBILITY_PRIVATE)
            .setWhen(now);
        if(Build.VERSION.SDK_INT<26)builder.setDefaults(Notification.DEFAULT_SOUND);
        try {
            manager.notify(BASE_ID+slot,builder.build());
            prefs.edit().putString("last_"+slot,today).apply();
            return true;
        } catch(SecurityException ignored) {return false;}
    }
}
