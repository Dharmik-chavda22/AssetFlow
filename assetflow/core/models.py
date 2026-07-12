from django.db import models
from django.contrib.auth.models import User

from .choices import *
from .mixins import TimeStampedModel


class Department(TimeStampedModel):
    name = models.CharField(max_length=100, unique=True)
    code = models.CharField(max_length=10, unique=True)
    status = models.CharField(
        max_length=10,
        choices=DEPARTMENT_STATUS,
        default="ACTIVE"
    )

    def __str__(self):
        return self.name


class EmployeeProfile(TimeStampedModel):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="profile"
    )

    department = models.ForeignKey(
        Department,
        on_delete=models.SET_NULL,
        null=True,
        blank=True
    )

    role = models.CharField(
        max_length=30,
        choices=ROLE_CHOICES,
        default="EMPLOYEE"
    )

    phone = models.CharField(
        max_length=15,
        blank=True
    )

    designation = models.CharField(
        max_length=100,
        blank=True
    )

    def __str__(self):
        return self.user.get_full_name() or self.user.username


class AssetCategory(TimeStampedModel):
    name = models.CharField(max_length=100, unique=True)
    description = models.TextField(blank=True)

    def __str__(self):
        return self.name


class Asset(TimeStampedModel):
    asset_tag = models.CharField(
        max_length=20,
        unique=True
    )

    name = models.CharField(
        max_length=150
    )

    category = models.ForeignKey(
        AssetCategory,
        on_delete=models.PROTECT
    )

    department = models.ForeignKey(
        Department,
        on_delete=models.PROTECT
    )

    serial_number = models.CharField(
        max_length=100,
        unique=True,
        blank=True,
        null=True
    )

    location = models.CharField(
        max_length=150
    )

    acquisition_date = models.DateField()

    acquisition_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2
    )

    status = models.CharField(
        max_length=20,
        choices=ASSET_STATUS,
        default="AVAILABLE"
    )

    condition = models.CharField(
        max_length=20,
        choices=CONDITION_CHOICES,
        default="GOOD"
    )

    shared_bookable = models.BooleanField(default=False)

    def __str__(self):
        return f"{self.asset_tag} - {self.name}"


class Allocation(TimeStampedModel):
    asset = models.ForeignKey(
        Asset,
        on_delete=models.CASCADE
    )

    employee = models.ForeignKey(
        EmployeeProfile,
        on_delete=models.CASCADE
    )

    allocated_on = models.DateField(auto_now_add=True)

    expected_return = models.DateField()

    returned = models.BooleanField(default=False)

    remarks = models.TextField(blank=True)

    def __str__(self):
        return f"{self.asset} -> {self.employee}"