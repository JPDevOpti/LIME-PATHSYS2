from datetime import datetime, date, timedelta, timezone

def get_easter_date(year):
    """Calculates Easter Sunday for a given year using the Butcher's algorithm."""
    a = year % 19
    b = year // 100
    c = year % 100
    d = b // 4
    e = b % 4
    f = (b + 8) // 25
    g = (b - f + 1) // 3
    h = (19 * a + b - d - g + 15) % 30
    i = c // 4
    k = c % 4
    l = (32 + 2 * e + 2 * i - h - k) % 7
    m = (a + 11 * h + 22 * l) // 451
    month = (h + l - 7 * m + 114) // 31
    day = ((h + l - 7 * m + 114) % 31) + 1
    return date(year, month, day)

def get_emiliani_monday(d: date) -> date:
    """If the date is not a Monday, move it to the following Monday."""
    if d.weekday() == 0:  # Monday
        return d
    return d + timedelta(days=(7 - d.weekday()))

def get_colombian_holidays(year):
    holidays = set()
    
    # Fixed
    holidays.add(date(year, 1, 1))    # Año Nuevo
    holidays.add(date(year, 5, 1))    # Día del Trabajo
    holidays.add(date(year, 7, 20))   # Grito de Independencia
    holidays.add(date(year, 8, 7))    # Batalla de Boyacá
    holidays.add(date(year, 12, 8))   # Inmaculada Concepción
    holidays.add(date(year, 12, 25))  # Navidad
    
    # Emiliani Law (Moved to Monday)
    holidays.add(get_emiliani_monday(date(year, 1, 6)))    # Reyes Magos
    holidays.add(get_emiliani_monday(date(year, 3, 19)))   # San José
    holidays.add(get_emiliani_monday(date(year, 6, 29)))   # San Pedro y San Pablo
    holidays.add(get_emiliani_monday(date(year, 8, 15)))   # Asunción de la Virgen
    holidays.add(get_emiliani_monday(date(year, 10, 12)))  # Día de la Raza
    holidays.add(get_emiliani_monday(date(year, 11, 1)))   # Todos los Santos
    holidays.add(get_emiliani_monday(date(year, 11, 11)))  # Independencia de Cartagena
    
    # Easter Linked
    easter = get_easter_date(year)
    holidays.add(easter - timedelta(days=3))  # Jueves Santo
    holidays.add(easter - timedelta(days=2))  # Viernes Santo
    
    holidays.add(get_emiliani_monday(easter + timedelta(days=43))) # Ascensión del Señor
    holidays.add(get_emiliani_monday(easter + timedelta(days=64))) # Corpus Christi
    holidays.add(get_emiliani_monday(easter + timedelta(days=71))) # Sagrado Corazón
    
    return holidays

def calculate_opportunity_days(start_dt: datetime, end_dt: datetime) -> int:
    """
    Calculates business days between start_dt and end_dt excluding weekends and Colombian holidays.
    If start and end are the same day, returns 0.
    """
    # Normalize to naive UTC for comparison if needed
    s = start_dt.replace(tzinfo=None) if start_dt.tzinfo else start_dt
    e = end_dt.replace(tzinfo=None) if end_dt.tzinfo else end_dt
    
    if s > e:
        return 0
    
    # Work with dates
    current_date = start_dt.date()
    end_date = end_dt.date()
    
    business_days = 0
    
    # Pre-calculate holidays for relevant years
    years = range(current_date.year, end_date.year + 1)
    all_holidays = set()
    for y in years:
        all_holidays.update(get_colombian_holidays(y))
    
    # Iterate through days
    temp_date = current_date
    while temp_date < end_date:
        temp_date += timedelta(days=1)
        
        # Check if it's a weekend (5=Saturday, 6=Sunday)
        if temp_date.weekday() >= 5:
            continue
        
        # Check if it's a holiday
        if temp_date in all_holidays:
            continue
            
        business_days += 1
            
    return business_days

def get_business_days_cutoff(end_dt: datetime, max_days: int) -> datetime:
    """
    Calculates the earliest date 'D' such that the number of business days 
    between 'D' and 'end_dt' is exactly 'max_days'.
    Used to filter in-progress cases.
    """
    target_date = end_dt.date()
    found_business_days = 0
    
    # Pre-calculate holidays for this year and previous (safety)
    holidays = get_colombian_holidays(target_date.year)
    holidays.update(get_colombian_holidays(target_date.year - 1))
    
    current = target_date
    while found_business_days < max_days:
        current -= timedelta(days=1)
        
        # Check if 'current' is a business day
        if current.weekday() < 5 and current not in holidays:
            found_business_days += 1
            
    return datetime(current.year, current.month, current.day, tzinfo=timezone.utc if end_dt.tzinfo else None)
