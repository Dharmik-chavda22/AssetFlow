ROLE_CHOICES = [
    ("ADMIN", "Admin"),
    ("MANAGER", "Asset Manager"),
    ("HEAD", "Department Head"),
    ("EMPLOYEE", "Employee"),
]

ASSET_STATUS = [
    ("AVAILABLE", "Available"),
    ("ALLOCATED", "Allocated"),
    ("BOOKED", "Booked"),
    ("MAINTENANCE", "Under Maintenance"),
    ("LOST", "Lost"),
    ("RETIRED", "Retired"),
]

MAINTENANCE_STATUS = [
    ("PENDING", "Pending"),
    ("APPROVED", "Approved"),
    ("IN_PROGRESS", "In Progress"),
    ("RESOLVED", "Resolved"),
    ("REJECTED", "Rejected"),
]

BOOKING_STATUS = [
    ("UPCOMING", "Upcoming"),
    ("ONGOING", "Ongoing"),
    ("COMPLETED", "Completed"),
    ("CANCELLED", "Cancelled"),
]

CONDITION_CHOICES = [
    ("EXCELLENT", "Excellent"),
    ("GOOD", "Good"),
    ("FAIR", "Fair"),
    ("POOR", "Poor"),
    ("DAMAGED", "Damaged"),
]

DEPARTMENT_STATUS = [
    ("ACTIVE", "Active"),
    ("INACTIVE", "Inactive"),
]

TRANSFER_STATUS = [
    ("PENDING", "Pending"),
    ("APPROVED", "Approved"),
    ("REJECTED", "Rejected"),
]

AUDIT_STATUS = [
    ("DRAFT", "Draft"),
    ("ACTIVE", "Active"),
    ("CLOSED", "Closed"),
]