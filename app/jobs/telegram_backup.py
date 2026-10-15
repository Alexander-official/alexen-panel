from app import scheduler, tgbot

# every minute: the backup the panel's Telegram bot sends on a schedule, when it is due
scheduler.add_job(tgbot.backup_job, 'interval', minutes=1, coalesce=True, max_instances=1, misfire_grace_time=300)
