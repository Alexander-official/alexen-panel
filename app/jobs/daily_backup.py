from datetime import datetime, timedelta

from app import backup, scheduler

# checked hourly (first time shortly after start); a backup is written when the
# last one is older than a day. The grace time keeps a late start from skipping it.
scheduler.add_job(backup.daily_job, 'interval', hours=1, coalesce=True, max_instances=1,
                  next_run_time=datetime.now() + timedelta(seconds=30), misfire_grace_time=3600)
