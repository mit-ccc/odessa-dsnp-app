import arrow
import datetime
import warnings


class Time(object):
    def __init__(self, local_tz: str = "US/Eastern"):
        self._tz = local_tz

    def now(self):
        warnings.warn(f"Using customized timezone: '{self._tz}'", stacklevel=0)
        return arrow.now(self._tz)

    def timestamp(self):
        warnings.warn(f"Using customized timezone: '{self._tz}'", stacklevel=0)
        return self.now().timestamp()

    @staticmethod
    def utcnow():
        return arrow.utcnow()

    @staticmethod
    def timedelta(*args, **kargs):
        return datetime.timedelta(*args, **kargs)


time = Time()

if __name__ == "__main__":
    print(time.now())
    print(time.utcnow())
    print(time.timedelta(hours=17) + time.timedelta(days=1))
    print(time.utcnow().date())
    print(time.timestamp())
    assert time.utcnow() < time.now()

    now = time.now()
    print(now.year, now.month, now.day)

    time = now.replace(day=31, hour=10, minute=0, second=0, microsecond=0)
    print(time.shift(days=1))

    print(time.shift(**{"days": 3}))
