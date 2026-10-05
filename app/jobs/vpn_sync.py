from app import scheduler, vpn

scheduler.add_job(vpn.sync, 'interval', seconds=10, coalesce=True, max_instances=1)
