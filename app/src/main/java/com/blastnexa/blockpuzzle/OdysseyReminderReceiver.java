package com.blastnexa.blockpuzzle;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import java.util.Calendar;

/** Restores local-time invitations after reboot, update or clock changes. */
public final class OdysseyReminderReceiver extends BroadcastReceiver {
    @Override public void onReceive(Context context,Intent intent) {
        if(intent==null)return;
        String action=intent.getAction();
        if(OdysseyReminders.ACTION.equals(action)) {
            int slot=intent.getIntExtra(OdysseyReminders.EXTRA_SLOT,-1);
            if(slot<0 || slot>=3)return;
            OdysseyReminders.deliver(context,slot,intent.getStringExtra(OdysseyReminders.EXTRA_DAY),System.currentTimeMillis());
            OdysseyReminders.scheduleSlot(context,slot,Calendar.getInstance());
        } else if(Intent.ACTION_BOOT_COMPLETED.equals(action) || Intent.ACTION_MY_PACKAGE_REPLACED.equals(action)
                || Intent.ACTION_TIME_CHANGED.equals(action) || Intent.ACTION_TIMEZONE_CHANGED.equals(action)) {
            OdysseyReminders.scheduleAll(context);
        }
    }
}
