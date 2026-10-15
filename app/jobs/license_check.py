from app import license, scheduler

# the license asked again every few hours (the panel also asks at start, app/__init__.py)
scheduler.add_job(license.check, 'interval', hours=license.CHECK_HOURS, coalesce=True, max_instances=1,
                  misfire_grace_time=3600, jitter=600)
