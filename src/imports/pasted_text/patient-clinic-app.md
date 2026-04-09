Revise and improve the Patient Side of my Clinic Appointment System. This system must allow patients to easily book and manage their appointments.

Patient Modules

Dashboard
Display:

Upcoming Appointment

Appointment Status

Notifications

Book Appointment

Patients must be able to:

Select doctor

Select available date

Select available time

Important rules:

Patient cannot select a time slot that is already full.

Appointment slots must depend on the schedule set by Admin/Staff.

Appointment Type

When booking, the system must automatically mark the appointment as:

Online Appointment

If the patient comes directly to the clinic and staff registers them, the system should mark it as:

Walk-in

My Appointments

Patients can:

View upcoming appointments

View appointment history

Cancel their appointment

Appointment Cancellation Logic

If patient cancels appointment:

Example:
Patient cancels 8AM appointment

System should:

Mark appointment as Cancelled

Inform the admin/staff

Allow the time slot to become available again if admin allows reopening

Live Chat

Patients can chat with clinic staff.

Features:

Ask questions about appointments

Receive replies from staff

Notification when staff responds

Notifications

Patients should receive notifications for:

Appointment approval

Appointment cancellation

Appointment reminders

Chat replies from staff

My Profile

Patient can:

Edit personal information

Update contact number

Update address

Clinic Map

Add a map showing the clinic location so patients can easily find the clinic.
https://maps.app.goo.gl/mVSMzAtFzsqz4nwi6 
Blk 35 Lot 12 Sector IIB Brgy, Capas, 2315 Tarlac


Open now

Monday
6:30 AM–3:30 PM

Tuesday
6:30 AM–3:30 PM

Wednesday
6:30 AM–3:30 PM

Thursday
(Eid al-Fitr)
6:30 AM–3:30 PM
Hours might differ

Friday
(Eid al-Fitr)
6:30 AM–3:30 PM
Hours might differ

Saturday
6:30 AM–3:30 PM

Sunday
Closed


Critical System Improvements (You Should Add)

Since you said you feel something is weak in the schedule system, here are 3 improvements that will make your project stronger during defense:

1. Slot Capacity

Example:

8AM slot = max 3 patients

After 3 bookings → slot becomes FULL

2. Automatic Time Slot Generation

Instead of manually adding times, system generates:

8:00
8:30
9:00
9:30

Based on clinic hours.

3. Walk-in Priority

Walk-in patients can override available slots but system still records them.