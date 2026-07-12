import React, { useState, useMemo, useRef, useEffect } from "react";
import { Toaster, toast } from "sonner";
import { clsx } from "clsx";
import Papa from "papaparse";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import {
  LayoutDashboard, Package, Calendar, Wrench, ClipboardList,
  BarChart3, Bell, LogOut, Plus, Search, Check, X,
  AlertTriangle, Clock, Building2, Tag, ChevronRight,
  ChevronLeft, Menu, CheckCircle, XCircle, Shield,
  FileText, ArrowUpRight, Info, UserCheck, Edit,
  TrendingUp, RotateCcw, Download, ArrowRight, Lock,
  Mail, Send, Archive, IndianRupee, Camera,
  MapPin, Phone, Globe, User
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";

// ─── TYPES ────────────────────────────────────────────────────────────────────
type Role = "admin" | "manager" | "dept_head" | "employee";
type Screen = "login" | "signup" | "dashboard" | "assets" | "asset-detail" | "allocation" | "booking" | "maintenance" | "audit" | "reports" | "org-setup" | "notifications";
type AssetStatus = "Available" | "Allocated" | "Reserved" | "Under Maintenance" | "Lost" | "Retired" | "Disposed";
type MaintStatus = "Pending" | "Approved" | "Rejected" | "Technician Assigned" | "In Progress" | "Resolved";
type BookStatus = "Upcoming" | "Ongoing" | "Completed" | "Cancelled";
type Priority = "Low" | "Medium" | "High" | "Critical";
type Condition = "Excellent" | "Good" | "Fair" | "Poor";

interface User { id: string; name: string; email: string; role: Role; department: string; avatar: string; phone?: string; city?: string; }
interface Asset {
  id: string; tag: string; name: string; category: string; status: AssetStatus;
  location: string; department: string; serialNumber: string; acquisitionDate: string;
  acquisitionCost: number; condition: Condition; assignedTo?: string; assignedToId?: string;
  expectedReturn?: string; bookable: boolean; notes?: string;
}
interface MaintReq {
  id: string; assetId: string; assetName: string; assetTag: string; issue: string;
  priority: Priority; status: MaintStatus; requestedBy: string; requestedDate: string;
  approvedBy?: string; technician?: string; resolvedDate?: string; notes?: string;
}
interface Booking {
  id: string; resourceId: string; resourceName: string; bookedBy: string; bookedById: string;
  date: string; startTime: string; endTime: string; status: BookStatus; purpose: string; department: string;
}
interface Notif { id: string; type: "info"|"success"|"warning"|"error"; title: string; message: string; timestamp: string; read: boolean; }
interface AuditItem { assetId: string; assetName: string; assetTag: string; result: "Verified"|"Missing"|"Damaged"|"Pending"; }
interface AuditCycle { id: string; name: string; scope: string; startDate: string; endDate: string; auditor: string; status: "Active"|"Closed"; items: AuditItem[]; }
interface Department { id: string; name: string; headId?: string; location: string; budget: number; active: boolean; }
interface Category { id: string; name: string; depreciationRate: number; description: string; }

// ─── CONSTANTS ────────────────────────────────────────────────────────────────
const ROLE_LABEL_EN: Record<Role,string> = { admin:"Admin", manager:"Asset Manager", dept_head:"Dept Head", employee:"Employee" };

// ─── INDIA SEED DATA ──────────────────────────────────────────────────────────
const INIT_DEPARTMENTS: Department[] = [
  { id:"d1", name:"Administration",       headId:"u1", location:"Mumbai, Maharashtra", budget:5000000,  active:true },
  { id:"d2", name:"Information Technology", headId:"u2", location:"Pune, Maharashtra",budget:8500000,  active:true },
  { id:"d3", name:"Operations",     headId:"u3", location:"Chennai, Tamil Nadu",  budget:6200000,  active:true },
  { id:"d4", name:"Finance",           headId:"u7", location:"Kolkata, West Bengal", budget:4800000,  active:true },
  { id:"d5", name:"Human Resources",headId:"u5", location:"Bengaluru, Karnataka", budget:3500000,  active:true },
  { id:"d6", name:"Facilities",      headId:undefined, location:"Hyderabad, Telangana", budget:2900000,  active:true },
];

const INIT_CATEGORIES: Category[] = [
  { id:"c1", name:"Electronics", depreciationRate:20, description:"Computers, laptops, mobiles, printers" },
  { id:"c2", name:"Furniture",          depreciationRate:10, description:"Office desks, chairs, cabinets" },
  { id:"c3", name:"Vehicles",             depreciationRate:15, description:"Cars, trucks, two-wheelers" },
  { id:"c4", name:"Software Licenses",  depreciationRate:33, description:"Enterprise software licenses" },
  { id:"c5", name:"Lab Equipment",depreciationRate:12, description:"Lab and testing instruments" },
  { id:"c6", name:"Facilities & Rooms",   depreciationRate:5,  description:"Meeting rooms, halls, training centers" },
];

const DEPT_NAMES = INIT_DEPARTMENTS.map(d => d.name);
const CAT_NAMES  = INIT_CATEGORIES.map(c => c.name);

const DEMO_USERS: User[] = [
  { id:"u1", name:"Rajesh Kumar Sharma",   email:"rajesh.sharma@bharat-corp.in",   role:"admin",     department:"Administration",           avatar:"RK", phone:"+91 98201 55432", city:"Mumbai" },
  { id:"u2", name:"Ananya Krishnamurthy",  email:"ananya.k@bharat-corp.in",         role:"manager",   department:"Information Technology",  avatar:"AK", phone:"+91 97390 22187", city:"Pune" },
  { id:"u3", name:"Vikram Singh Rathore",  email:"vikram.rathore@bharat-corp.in",   role:"dept_head", department:"Operations",         avatar:"VS", phone:"+91 80041 73829", city:"Chennai" },
  { id:"u4", name:"Sunita Devi Agarwal",   email:"sunita.agarwal@bharat-corp.in",   role:"employee",  department:"Finance",               avatar:"SD", phone:"+91 73829 44921", city:"Kolkata" },
  { id:"u5", name:"Meera Nambiar Pillai",  email:"meera.pillai@bharat-corp.in",     role:"employee",  department:"Human Resources",    avatar:"MN", phone:"+91 91234 56789", city:"Bengaluru" },
  { id:"u6", name:"Arjun Venkataraman",    email:"arjun.v@bharat-corp.in",           role:"employee",  department:"Information Technology",  avatar:"AV", phone:"+91 88291 30045", city:"Pune" },
  { id:"u7", name:"Priya Lakshmi Rao",     email:"priya.rao@bharat-corp.in",         role:"dept_head", department:"Finance",               avatar:"PL", phone:"+91 93847 12309", city:"Kolkata" },
  { id:"u8", name:"Deepak Choudhary",      email:"deepak.c@bharat-corp.in",          role:"manager",   department:"Operations",         avatar:"DC", phone:"+91 76534 89012", city:"Chennai" },
  { id:"u9", name:"Kavitha Subramaniam",   email:"kavitha.s@bharat-corp.in",         role:"employee",  department:"Human Resources",    avatar:"KS", phone:"+91 87654 32109", city:"Bengaluru" },
  { id:"u10",name:"Rohit Mehta",           email:"rohit.mehta@bharat-corp.in",       role:"employee",  department:"Administration",           avatar:"RM", phone:"+91 99821 43210", city:"Mumbai" },
];

const INIT_ASSETS: Asset[] = [
  { id:"a1",  tag:"BHC-0001", name:"Dell Latitude 5540 Laptop",    category:"Electronics", status:"Allocated",         location:"3rd Floor, IT Wing, Mumbai",     department:"Information Technology", serialNumber:"DL5540-MH-2023-0091", acquisitionDate:"2023-04-12", acquisitionCost:85000,  condition:"Excellent", assignedTo:"Arjun Venkataraman", assignedToId:"u6", expectedReturn:"2026-04-12", bookable:false },
  { id:"a2",  tag:"BHC-0002", name:"HP OfficeJet Pro 9020 Printer", category:"Electronics", status:"Available",         location:"IT Storage, Pune",               department:"Information Technology", serialNumber:"HP-OJ9020-PUN-0022",  acquisitionDate:"2022-09-15", acquisitionCost:18500,  condition:"Good",      bookable:false },
  { id:"a3",  tag:"BHC-0003", name:"Conference Hall A (Electric)",         category:"Facilities & Rooms",   status:"Available",         location:"2nd Floor, Mumbai HQ",           department:"Administration",          serialNumber:"N/A",                 acquisitionDate:"2020-01-01", acquisitionCost:0,      condition:"Excellent", bookable:true },
  { id:"a4",  tag:"BHC-0004", name:"Epson EB-X51 Projector",       category:"Electronics", status:"Under Maintenance", location:"Maintenance, Pune",              department:"Operations",         serialNumber:"EPS-EB-X51-PUN-2021", acquisitionDate:"2021-07-20", acquisitionCost:42000,  condition:"Fair",      bookable:true },
  { id:"a5",  tag:"BHC-0005", name:"Maruti Suzuki Ertiga (MH-02 BZ 4521)", category:"Vehicles",    status:"Allocated",         location:"Parking Lot B, Chennai",         department:"Operations",         serialNumber:"VIN-MA3EWDE1S00400091",acquisitionDate:"2022-03-10", acquisitionCost:980000, condition:"Good",      assignedTo:"Deepak Choudhary", assignedToId:"u8", expectedReturn:"2025-03-10", bookable:false },
  { id:"a6",  tag:"BHC-0006", name:"Samsung Galaxy Tab S9+",       category:"Electronics", status:"Available",         location:"IT Storage, Mumbai",             department:"Information Technology", serialNumber:"SGT-S9P-MH-2023-0044", acquisitionDate:"2023-10-01", acquisitionCost:95000,  condition:"Excellent", bookable:false },
  { id:"a7",  tag:"BHC-0007", name:"Training Room B",          category:"Facilities & Rooms",   status:"Reserved",          location:"3rd Floor, Bengaluru Office",    department:"Administration",          serialNumber:"N/A",                 acquisitionDate:"2020-01-01", acquisitionCost:0,      condition:"Good",      bookable:true },
  { id:"a8",  tag:"BHC-0008", name:"Canon imageRUNNER 2625i",      category:"Electronics", status:"Allocated",         location:"Finance Dept, Kolkata",          department:"Finance",              serialNumber:"CAN-IR-2625-KOL-0011", acquisitionDate:"2021-11-05", acquisitionCost:35000,  condition:"Good",      assignedTo:"Sunita Devi Agarwal", assignedToId:"u4", bookable:false },
  { id:"a9",  tag:"BHC-0009", name:"Godrej Ergochair Premium",     category:"Furniture",          status:"Allocated",         location:"HR Office, Bengaluru",           department:"Human Resources",   serialNumber:"GEP-CH-BLR-2023-0077", acquisitionDate:"2023-02-14", acquisitionCost:22000,  condition:"Excellent", assignedTo:"Meera Nambiar Pillai", assignedToId:"u5", bookable:false },
  { id:"a10", tag:"BHC-0010", name:"Microsoft 365 E3 (25 Users)",  category:"Software Licenses",  status:"Available",         location:"Digital — Cloud",                department:"Information Technology", serialNumber:"MS365-E3-BHC-2024",    acquisitionDate:"2024-01-01", acquisitionCost:150000, condition:"Excellent", bookable:false },
  { id:"a11", tag:"BHC-0011", name:"Fluke 87V Oscilloscope",       category:"Lab Equipment",status:"Available",         location:"Lab Room 101, Chennai",          department:"Operations",         serialNumber:"FL-87V-CHN-2022-0033", acquisitionDate:"2022-06-20", acquisitionCost:28500,  condition:"Good",      bookable:false },
  { id:"a12", tag:"BHC-0012", name:"Lenovo ThinkPad X1 Carbon",    category:"Electronics", status:"Lost",              location:"Unknown",                        department:"Finance",              serialNumber:"LTP-X1C-KOL-2023-0019",acquisitionDate:"2023-01-15", acquisitionCost:120000, condition:"Poor",      bookable:false },
  { id:"a13", tag:"BHC-0013", name:"Godrej Interio Executive Desk", category:"Furniture",         status:"Allocated",         location:"Admin Office, Mumbai",           department:"Administration",          serialNumber:"GIE-DSK-MH-0047",      acquisitionDate:"2022-10-10", acquisitionCost:45000,  condition:"Excellent", assignedTo:"Rajesh Kumar Sharma", assignedToId:"u1", bookable:false },
  { id:"a14", tag:"BHC-0014", name:"Logitech PTZ Pro 2 Camera",    category:"Electronics", status:"Retired",           location:"IT Storage, Pune",               department:"Information Technology", serialNumber:"LOG-PTZ2-PUN-2020-0011",acquisitionDate:"2020-05-01", acquisitionCost:25000,  condition:"Poor",      bookable:false },
  { id:"a15", tag:"BHC-0015", name:"Training Room (Basement)", category:"Facilities & Rooms",   status:"Available",         location:"Basement, Mumbai HQ",            department:"Human Resources",   serialNumber:"N/A",                 acquisitionDate:"2020-01-01", acquisitionCost:0,      condition:"Good",      bookable:true },
  { id:"a16", tag:"BHC-0016", name:"Tata Nexon EV (MH-04 DK 7823)",category:"Vehicles",            status:"Available",         location:"Parking A, Mumbai",              department:"Operations",         serialNumber:"VIN-MAT601026NP10001", acquisitionDate:"2023-12-01", acquisitionCost:1600000,condition:"Excellent", bookable:false },
  { id:"a17", tag:"BHC-0017", name:"Wipro Standing Desk Converter", category:"Furniture",         status:"Available",         location:"Human Resources, Bengaluru",    department:"Human Resources",   serialNumber:"WIP-SDC-BLR-2023-0012",acquisitionDate:"2023-03-10", acquisitionCost:8500,   condition:"Good",      bookable:false },
];

const INIT_MAINT: MaintReq[] = [
  { id:"m1", assetId:"a4", assetName:"Epson EB-X51 Projector",        assetTag:"BHC-0004", issue:"Lamp won't turn on, display flickers on startup",      priority:"High",     status:"In Progress",          requestedBy:"Deepak Choudhary",       requestedDate:"2024-07-08", approvedBy:"Ananya Krishnamurthy", technician:"TechCare Solutions, Pune", notes:"Lamp replacement ordered, delivery awaited" },
  { id:"m2", assetId:"a1", assetName:"Dell Latitude 5540 Laptop",      assetTag:"BHC-0001", issue:"Battery draining very quickly since the last update",       priority:"Medium",   status:"Pending",              requestedBy:"Arjun Venkataraman",     requestedDate:"2024-07-10" },
  { id:"m3", assetId:"a8", assetName:"Canon imageRUNNER 2625i",        assetTag:"BHC-0008", issue:"Frequent paper jams, looks like a roller issue",      priority:"Low",      status:"Resolved",             requestedBy:"Sunita Devi Agarwal",    requestedDate:"2024-06-28", approvedBy:"Ananya Krishnamurthy", technician:"Ravi Enterprises, Kolkata", resolvedDate:"2024-07-03", notes:"Roller replaced successfully" },
  { id:"m4", assetId:"a5", assetName:"Maruti Suzuki Ertiga",           assetTag:"BHC-0005", issue:"AC not working, unusual noise coming from the engine",     priority:"Critical", status:"Technician Assigned",  requestedBy:"Deepak Choudhary",       requestedDate:"2024-07-09", approvedBy:"Ananya Krishnamurthy", technician:"Chandra Auto Works, Chennai", notes:"Appointment booked for 12 July" },
  { id:"m5", assetId:"a2", assetName:"HP OfficeJet Pro 9020 Printer",  assetTag:"BHC-0002", issue:"Dead pixels appearing in the bottom-right corner",              priority:"Low",      status:"Approved",             requestedBy:"Arjun Venkataraman",     requestedDate:"2024-07-11", approvedBy:"Ananya Krishnamurthy" },
  { id:"m6", assetId:"a6", assetName:"Samsung Galaxy Tab S9+",         assetTag:"BHC-0006", issue:"Screen cracked, touchscreen not responding",        priority:"High",     status:"Rejected",             requestedBy:"Vikram Singh Rathore",   requestedDate:"2024-07-05", notes:"Negligence — not covered under warranty" },
];

const INIT_BOOKINGS: Booking[] = [
  { id:"b1", resourceId:"a3",  resourceName:"Conference Hall A (Electric)",       bookedBy:"Rajesh Kumar Sharma",  bookedById:"u1", date:"2024-07-12", startTime:"09:00", endTime:"10:00", status:"Ongoing",   purpose:"Quarterly Policy Meeting — Q3",       department:"Administration" },
  { id:"b2", resourceId:"a3",  resourceName:"Conference Hall A (Electric)",       bookedBy:"Vikram Singh Rathore", bookedById:"u3", date:"2024-07-12", startTime:"14:00", endTime:"16:00", status:"Upcoming",  purpose:"Operations Review",             department:"Operations" },
  { id:"b3", resourceId:"a7",  resourceName:"Training Room B",        bookedBy:"Sunita Devi Agarwal",  bookedById:"u4", date:"2024-07-12", startTime:"10:00", endTime:"11:00", status:"Upcoming",  purpose:"Budget Discussion — Financial Year",   department:"Finance" },
  { id:"b4", resourceId:"a15", resourceName:"Training Room (Basement)",bookedBy:"Meera Nambiar Pillai", bookedById:"u5", date:"2024-07-13", startTime:"09:00", endTime:"17:00", status:"Upcoming",  purpose:"New Employee Orientation",     department:"Human Resources" },
  { id:"b5", resourceId:"a3",  resourceName:"Conference Hall A (Electric)",       bookedBy:"Ananya Krishnamurthy", bookedById:"u2", date:"2024-07-11", startTime:"09:00", endTime:"11:00", status:"Completed", purpose:"IT Team Sprint Planning",          department:"Information Technology" },
  { id:"b6", resourceId:"a7",  resourceName:"Training Room B",        bookedBy:"Arjun Venkataraman",   bookedById:"u6", date:"2024-07-13", startTime:"14:00", endTime:"15:30", status:"Upcoming",  purpose:"System Design Review",          department:"Information Technology" },
  { id:"b7", resourceId:"a15", resourceName:"Training Room (Basement)",bookedBy:"Priya Lakshmi Rao",    bookedById:"u7", date:"2024-07-12", startTime:"13:00", endTime:"14:00", status:"Cancelled", purpose:"Financial Literacy Workshop",   department:"Finance" },
];

const INIT_NOTIFS: Notif[] = [
  { id:"n1", type:"success", title:"Asset Allocated",     message:"Dell Latitude 5540 (BHC-0001) has been assigned to Arjun Venkataraman.",     timestamp:"2024-07-10 09:30", read:false },
  { id:"n2", type:"warning", title:"Return Overdue",          message:"Maruti Suzuki Ertiga's scheduled return date of 31 Dec has passed.",      timestamp:"2025-01-01 08:00", read:false },
  { id:"n3", type:"info",    title:"Request Approved",       message:"Ananya approved the Epson Projector maintenance request.",                   timestamp:"2024-07-09 14:15", read:true  },
  { id:"n4", type:"success", title:"Booking Confirmed",     message:"Conference Hall A booked for 12 July, 9:00–10:00.",                      timestamp:"2024-07-09 10:00", read:true  },
  { id:"n5", type:"error",   title:"Request Rejected",      message:"Samsung Tab S9+ request rejected — screen break due to negligence.",             timestamp:"2024-07-06 11:30", read:false },
  { id:"n6", type:"info",    title:"Transfer Request",      message:"Ananya's HP Printer (BHC-0002) has a transfer request to the IT department.",            timestamp:"2024-07-08 16:00", read:false },
  { id:"n7", type:"warning", title:"Audit Discrepancy",   message:"Lenovo ThinkPad (BHC-0012) was marked 'Missing' in the Q3 Audit.",               timestamp:"2024-07-07 09:00", read:true  },
  { id:"n8", type:"success", title:"Return Successful",           message:"Sunita returned the Canon Printer in 'Good' condition.",                    timestamp:"2024-07-05 17:30", read:true  },
];

const INIT_AUDITS: AuditCycle[] = [
  { id:"ac1", name:"Q3 2024 IT Department Audit",        scope:"Information Technology", startDate:"2024-07-01", endDate:"2024-07-15", auditor:"Ananya Krishnamurthy", status:"Active", items:[
    { assetId:"a1",  assetName:"Dell Latitude 5540",        assetTag:"BHC-0001", result:"Verified" },
    { assetId:"a12", assetName:"Lenovo ThinkPad X1 Carbon", assetTag:"BHC-0012", result:"Missing"  },
    { assetId:"a14", assetName:"Logitech PTZ Pro 2",        assetTag:"BHC-0014", result:"Verified" },
    { assetId:"a2",  assetName:"HP OfficeJet Pro 9020",     assetTag:"BHC-0002", result:"Pending"  },
    { assetId:"a6",  assetName:"Samsung Galaxy Tab S9+",    assetTag:"BHC-0006", result:"Damaged"  },
  ]},
  { id:"ac2", name:"Q2 2024 Operations Audit",     scope:"Operations",        startDate:"2024-04-01", endDate:"2024-04-30", auditor:"Rajesh Kumar Sharma",  status:"Closed", items:[
    { assetId:"a4",  assetName:"Epson EB-X51 Projector",   assetTag:"BHC-0004", result:"Damaged"  },
    { assetId:"a5",  assetName:"Maruti Suzuki Ertiga",      assetTag:"BHC-0005", result:"Verified" },
    { assetId:"a11", assetName:"Fluke 87V Oscilloscope",    assetTag:"BHC-0011", result:"Verified" },
  ]},
];

const ACTIVITY_LOG = [
  { id:"l1", user:"Ananya Krishnamurthy",  action:"Allocated",       target:"Dell Latitude 5540 (BHC-0001)",    detail:"Assigned to Arjun Venkataraman",   time:"2024-07-10 09:28" },
  { id:"l2", user:"Arjun Venkataraman",    action:"Maintenance Request",  target:"Dell Latitude 5540 (BHC-0001)",    detail:"Reported battery issue",           time:"2024-07-10 11:45" },
  { id:"l3", user:"Ananya Krishnamurthy",  action:"Maintenance Approved",  target:"Epson Projector (BHC-0004)",       detail:"Assigned to external vendor",      time:"2024-07-09 14:15" },
  { id:"l4", user:"Rajesh Kumar Sharma",   action:"Resource Booking",     target:"Conference Hall A",                      detail:"12 July, 9:00–10:00",                 time:"2024-07-09 10:00" },
  { id:"l5", user:"Rajesh Kumar Sharma",   action:"Role Changed",           target:"Priya Lakshmi Rao",                detail:"Employee → Dept Head",           time:"2024-07-08 15:00" },
  { id:"l6", user:"Ananya Krishnamurthy",  action:"Asset Registered",    target:"Microsoft 365 E3 (BHC-0010)",      detail:"Added new software license",    time:"2024-07-08 10:30" },
  { id:"l7", user:"Deepak Choudhary",      action:"Maintenance Request",  target:"Maruti Suzuki Ertiga (BHC-0005)",  detail:"AC and engine noise issue",      time:"2024-07-09 08:00" },
  { id:"l8", user:"Sunita Devi Agarwal",   action:"Booking Cancelled",        target:"Conference Hall A",                      detail:"Meeting rescheduled", time:"2024-07-07 16:30" },
];

// ─── FORMATTERS ───────────────────────────────────────────────────────────────
const INR = (v: number) => v === 0 ? "N/A" : "₹" + v.toLocaleString("en-IN");
const INR_K = (v: number) => v >= 100000 ? `₹${(v/100000).toFixed(1)}L` : v >= 1000 ? `₹${(v/1000).toFixed(0)}K` : `₹${v}`;

// ─── STATUS COLOURS ───────────────────────────────────────────────────────────
const SC: Record<AssetStatus,{dot:string;text:string;bg:string;border:string;label:string}> = {
  Available:           {dot:"bg-emerald-500",text:"text-emerald-700",bg:"bg-emerald-50", border:"border-emerald-200",label:"Available"},
  Allocated:           {dot:"bg-indigo-500", text:"text-indigo-700", bg:"bg-indigo-50",  border:"border-indigo-200", label:"Allocated"},
  Reserved:            {dot:"bg-amber-500",  text:"text-amber-700",  bg:"bg-amber-50",   border:"border-amber-200",  label:"Reserved"},
  "Under Maintenance": {dot:"bg-orange-500", text:"text-orange-700", bg:"bg-orange-50",  border:"border-orange-200", label:"Under Maintenance"},
  Lost:                {dot:"bg-red-500",    text:"text-red-700",    bg:"bg-red-50",     border:"border-red-200",    label:"Lost"},
  Retired:             {dot:"bg-slate-400",  text:"text-slate-600",  bg:"bg-slate-100",  border:"border-slate-200",  label:"Retired"},
  Disposed:            {dot:"bg-slate-300",  text:"text-slate-500",  bg:"bg-slate-50",   border:"border-slate-200",  label:"Disposed"},
};
const MC: Record<MaintStatus,{text:string;bg:string;border:string}> = {
  Pending:               {text:"text-amber-700",  bg:"bg-amber-50",   border:"border-amber-200"},
  Approved:              {text:"text-blue-700",   bg:"bg-blue-50",    border:"border-blue-200"},
  Rejected:              {text:"text-red-700",    bg:"bg-red-50",     border:"border-red-200"},
  "Technician Assigned": {text:"text-purple-700", bg:"bg-purple-50",  border:"border-purple-200"},
  "In Progress":         {text:"text-orange-700", bg:"bg-orange-50",  border:"border-orange-200"},
  Resolved:              {text:"text-emerald-700",bg:"bg-emerald-50", border:"border-emerald-200"},
};
const PC: Record<Priority,{text:string;bg:string;border:string}> = {
  Critical:{text:"text-red-800",   bg:"bg-red-100",   border:"border-red-200"},
  High:    {text:"text-orange-800",bg:"bg-orange-100",border:"border-orange-200"},
  Medium:  {text:"text-amber-800", bg:"bg-amber-100", border:"border-amber-200"},
  Low:     {text:"text-slate-700", bg:"bg-slate-100", border:"border-slate-200"},
};
const BC: Record<BookStatus,{text:string;bg:string;border:string}> = {
  Upcoming:  {text:"text-blue-700",   bg:"bg-blue-50",   border:"border-blue-200"},
  Ongoing:   {text:"text-emerald-700",bg:"bg-emerald-50",border:"border-emerald-200"},
  Completed: {text:"text-slate-600",  bg:"bg-slate-100", border:"border-slate-200"},
  Cancelled: {text:"text-red-700",    bg:"bg-red-50",    border:"border-red-200"},
};

// ─── NAV ──────────────────────────────────────────────────────────────────────
const NAV_CFG: {id:Screen;label:string;icon:React.ElementType;roles?:Role[]}[] = [
  {id:"dashboard",    label:"Dashboard",       icon:LayoutDashboard},
  {id:"assets",       label:"Asset Directory",  icon:Package},
  {id:"allocation",   label:"Allocation",       icon:UserCheck,    roles:["admin","manager","dept_head"]},
  {id:"booking",      label:"Booking",         icon:Calendar},
  {id:"maintenance",  label:"Maintenance",       icon:Wrench},
  {id:"audit",        label:"Audit",           icon:ClipboardList,roles:["admin","manager"]},
  {id:"reports",      label:"Reports",      icon:BarChart3,    roles:["admin","manager","dept_head"]},
  {id:"org-setup",    label:"Organization Setup",icon:Building2,    roles:["admin"]},
  {id:"notifications",label:"Notifications",       icon:Bell},
];
const getNav = (role: Role) => NAV_CFG.filter(n => !n.roles || n.roles.includes(role));

// ─── LOGO ─────────────────────────────────────────────────────────────────────
function Logo({ size = 36 }: { size?: number }) {
  const r = size * 0.25;
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="lg1" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#4f46e5"/>
          <stop offset="100%" stopColor="#7c3aed"/>
        </linearGradient>
      </defs>
      <rect width="48" height="48" rx={r} fill="url(#lg1)"/>
      {/* Chakra-inspired 4-part grid with flow arrows */}
      <rect x="7"  y="7"  width="14" height="14" rx="3.5" fill="white" fillOpacity="0.95"/>
      <rect x="27" y="7"  width="14" height="14" rx="3.5" fill="white" fillOpacity="0.55"/>
      <rect x="7"  y="27" width="14" height="14" rx="3.5" fill="white" fillOpacity="0.55"/>
      <rect x="27" y="27" width="14" height="14" rx="3.5" fill="white" fillOpacity="0.95"/>
      {/* Centre flow arrows */}
      <path d="M22 19 L26 19 M19 22 L19 26" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.8"/>
      <path d="M26 29 L22 29 M29 26 L29 22" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeOpacity="0.8"/>
    </svg>
  );
}

// ─── ATOMS ────────────────────────────────────────────────────────────────────
function SBadge({ status }: { status: AssetStatus }) {
  const c = SC[status];
  return <span className={clsx("inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border", c.text, c.bg, c.border)}><span className={clsx("w-1.5 h-1.5 rounded-full shrink-0", c.dot)}/>{c.label}</span>;
}
function MBadge({ status }: { status: MaintStatus }) {
  const c = MC[status];
  return <span className={clsx("inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border", c.text, c.bg, c.border)}>{status}</span>;
}
function PBadge({ priority }: { priority: Priority }) {
  const c = PC[priority];
  return <span className={clsx("inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border", c.text, c.bg, c.border)}>{priority}</span>;
}
function BBadge({ status }: { status: BookStatus }) {
  const c = BC[status];
  return <span className={clsx("inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border", c.text, c.bg, c.border)}>{status}</span>;
}
function RBadge({ role }: { role: Role }) {
  const cls: Record<Role,string> = {
    admin:     "text-purple-700 bg-purple-50 border-purple-200",
    manager:   "text-indigo-700 bg-indigo-50 border-indigo-200",
    dept_head: "text-blue-700 bg-blue-50 border-blue-200",
    employee:  "text-slate-700 bg-slate-100 border-slate-200",
  };
  return <span className={clsx("inline-flex px-2.5 py-0.5 rounded-full text-xs font-semibold border", cls[role])}>{ROLE_LABEL_EN[role]}</span>;
}
function Av({ initials, size="sm", color }: { initials: string; size?: "xs"|"sm"|"md"|"lg"; color?: string }) {
  const s = { xs:"w-6 h-6 text-[10px]", sm:"w-8 h-8 text-xs", md:"w-10 h-10 text-sm", lg:"w-14 h-14 text-lg" }[size];
  const bg = color || "linear-gradient(135deg,#4f46e5,#7c3aed)";
  return <div className={clsx("rounded-full flex items-center justify-center font-bold shrink-0 tracking-wide text-white", s)} style={{background:bg}}>{initials}</div>;
}
function Btn({ children, variant="primary", size="sm", onClick, disabled, full, className }: {
  children: React.ReactNode; variant?: "primary"|"secondary"|"ghost"|"danger"|"outline";
  size?: "xs"|"sm"|"md"; onClick?: () => void; disabled?: boolean; full?: boolean; className?: string;
}) {
  const base = "inline-flex items-center justify-center gap-2 font-semibold rounded-xl transition-all duration-150 cursor-pointer select-none disabled:opacity-40 disabled:cursor-not-allowed shrink-0";
  const sz   = { xs:"px-3 py-1.5 text-xs", sm:"px-4 py-2 text-sm", md:"px-5 py-2.5 text-sm" }[size];
  const v    = {
    primary:   "bg-indigo-600 text-white hover:bg-indigo-700 active:scale-95 shadow-sm shadow-indigo-200",
    secondary: "bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200",
    ghost:     "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    danger:    "bg-red-600 text-white hover:bg-red-700 active:scale-95",
    outline:   "border border-slate-200 text-slate-700 bg-white hover:bg-slate-50",
  }[variant];
  return <button className={clsx(base,sz,v,full&&"w-full",className)} onClick={onClick} disabled={disabled}>{children}</button>;
}
function Card({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return <div className={clsx("bg-white rounded-2xl border border-slate-100 shadow-sm", onClick&&"cursor-pointer hover:shadow-md hover:border-indigo-200 transition-all duration-200",className)} onClick={onClick}>{children}</div>;
}
function Modal({ title, subtitle, children, onClose, width="max-w-lg" }: {
  title: string; subtitle?: string; children: React.ReactNode; onClose: () => void; width?: string;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose}/>
      <div className={clsx("relative bg-white rounded-2xl shadow-2xl w-full my-4 max-h-[90vh] overflow-y-auto",width)}>
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100">
          <div><h2 className="text-base font-bold text-slate-900">{title}</h2>{subtitle&&<p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}</div>
          <button onClick={onClose} className="p-2 rounded-lg hover:bg-slate-100 transition-colors text-slate-400 hover:text-slate-700 ml-4"><X className="w-4 h-4"/></button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
function Fld({ label, children }: { label: string; children: React.ReactNode }) {
  return <div><label className="block text-xs font-bold text-slate-500 mb-1.5 uppercase tracking-wide">{label}</label>{children}</div>;
}
function Inp({ value, onChange, placeholder, type="text", readOnly }: { value: string; onChange?: (v: string) => void; placeholder?: string; type?: string; readOnly?: boolean }) {
  return <input type={type} value={value} placeholder={placeholder} readOnly={readOnly} onChange={e => onChange?.(e.target.value)} className={clsx("w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 transition-all placeholder:text-slate-400", readOnly&&"opacity-60 cursor-not-allowed")} />;
}
function Sel({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: {value:string;label:string}[] }) {
  return <select value={value} onChange={e => onChange(e.target.value)} className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 transition-all">{options.map(o=><option key={o.value} value={o.value}>{o.label}</option>)}</select>;
}
function Txtarea({ value, onChange, placeholder, rows=3 }: { value: string; onChange: (v: string) => void; placeholder?: string; rows?: number }) {
  return <textarea value={value} placeholder={placeholder} rows={rows} onChange={e => onChange(e.target.value)} className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400 transition-all placeholder:text-slate-400 resize-none"/>;
}
function Empty({ icon: Icon, title, desc, action }: { icon: React.ElementType; title: string; desc: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center gap-2">
      <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-1"><Icon className="w-7 h-7 text-slate-400"/></div>
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      <p className="text-xs text-slate-400 max-w-[220px]">{desc}</p>
      {action&&<div className="mt-3">{action}</div>}
    </div>
  );
}
function Steps({ steps, current }: { steps: string[]; current: number }) {
  return (
    <div className="flex items-start overflow-x-auto pb-1">
      {steps.map((s,i) => (
        <React.Fragment key={s}>
          <div className="flex flex-col items-center min-w-[60px]">
            <div className={clsx("w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all",
              i<current?"bg-indigo-600 border-indigo-600 text-white":i===current?"bg-white border-indigo-500 text-indigo-600":"bg-slate-100 border-slate-200 text-slate-400")}>
              {i<current?<Check className="w-4 h-4"/>:i+1}
            </div>
            <span className={clsx("text-[10px] mt-1.5 font-semibold text-center leading-tight",i===current?"text-indigo-700":i<current?"text-slate-700":"text-slate-400")}>{s}</span>
          </div>
          {i<steps.length-1&&<div className={clsx("h-0.5 w-8 mt-4 transition-all shrink-0",i<current?"bg-indigo-500":"bg-slate-200")}/>}
        </React.Fragment>
      ))}
    </div>
  );
}
function KPI({ label, value, sub, icon: Icon, color, onClick }: { label:string; value:string|number; sub:string; icon:React.ElementType; color:string; onClick?:()=>void }) {
  const cc: Record<string,{i:string;v:string;bg:string}> = {
    emerald:{i:"text-emerald-600",v:"text-emerald-700",bg:"bg-emerald-50"},
    indigo: {i:"text-indigo-600", v:"text-indigo-700", bg:"bg-indigo-50"},
    orange: {i:"text-orange-600", v:"text-orange-700", bg:"bg-orange-50"},
    amber:  {i:"text-amber-600",  v:"text-amber-700",  bg:"bg-amber-50"},
    red:    {i:"text-red-600",    v:"text-red-700",    bg:"bg-red-50"},
    blue:   {i:"text-blue-600",   v:"text-blue-700",   bg:"bg-blue-50"},
  };
  const c = cc[color]||cc.indigo;
  return (
    <Card className="p-5" onClick={onClick}>
      <div className="flex items-start justify-between mb-3">
        <div className={clsx("w-10 h-10 rounded-xl flex items-center justify-center",c.bg)}><Icon className={clsx("w-5 h-5",c.i)}/></div>
        <ArrowUpRight className="w-4 h-4 text-slate-300"/>
      </div>
      <div className={clsx("text-2xl font-black",c.v)}>{value}</div>
      <div className="text-sm font-semibold text-slate-700 mt-0.5">{label}</div>
      <div className="text-xs text-slate-400 mt-0.5">{sub}</div>
    </Card>
  );
}

// ─── PROFILE DROPDOWN ─────────────────────────────────────────────────────────
function ProfileDropdown({ user, logout, nav }: { user: User; logout: () => void; nav: (s: Screen) => void }) {
  const [open, setOpen] = useState(false);
  const [showEdit, setEdit] = useState(false);
  const [editForm, setEF] = useState({ name:user.name, phone:user.phone||"", city:user.city||"" });
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const saveProfile = () => {
    toast.success("Profile updated successfully!", { description: `Welcome, ${editForm.name.split(" ")[0]}!` });
    setEdit(false);
    setOpen(false);
  };

  const roleColors: Record<Role,string> = {
    admin:     "linear-gradient(135deg,#7c3aed,#4f46e5)",
    manager:   "linear-gradient(135deg,#4f46e5,#0ea5e9)",
    dept_head: "linear-gradient(135deg,#0ea5e9,#06b6d4)",
    employee:  "linear-gradient(135deg,#64748b,#475569)",
  };

  return (
    <div className="relative" ref={ref}>
      <button onClick={() => setOpen(o=>!o)} className={clsx("flex items-center gap-2.5 px-3 py-2 rounded-xl transition-all hover:bg-slate-100", open&&"bg-slate-100")}>
        <Av initials={user.avatar} size="sm" color={roleColors[user.role]} />
        <div className="hidden sm:block text-left">
          <p className="text-xs font-bold text-slate-900 leading-tight">{user.name.split(" ").slice(0,2).join(" ")}</p>
          <p className="text-[10px] text-slate-400">{ROLE_LABEL_EN[user.role]}</p>
        </div>
        <ChevronRight className={clsx("w-3 h-3 text-slate-400 transition-transform hidden sm:block", open&&"rotate-90")} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-72 bg-white rounded-2xl shadow-2xl border border-slate-100 z-50 overflow-hidden">
          {/* Header */}
          <div className="p-5 border-b border-slate-100" style={{background:"linear-gradient(135deg,#f5f3ff,#ede9fe)"}}>
            <div className="flex items-center gap-3 mb-3">
              <Av initials={user.avatar} size="lg" color={roleColors[user.role]} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-black text-slate-900 truncate">{user.name}</p>
                <p className="text-xs text-indigo-600 font-semibold">{ROLE_LABEL_EN[user.role]}</p>
                <p className="text-xs text-slate-400 truncate">{user.department}</p>
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-slate-600"><Mail className="w-3.5 h-3.5 text-slate-400"/>{user.email}</div>
              {user.phone && <div className="flex items-center gap-2 text-xs text-slate-600"><Phone className="w-3.5 h-3.5 text-slate-400"/>{user.phone}</div>}
              {user.city && <div className="flex items-center gap-2 text-xs text-slate-600"><MapPin className="w-3.5 h-3.5 text-slate-400"/>{user.city}, India</div>}
            </div>
          </div>

          {/* Menu */}
          <div className="p-2">
            <button onClick={() => { setEdit(true); setOpen(false); }} className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl transition-colors">
              <Edit className="w-4 h-4"/> Edit Profile
            </button>
            <button onClick={() => { nav("notifications"); setOpen(false); }} className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl transition-colors">
              <Bell className="w-4 h-4"/> Notifications
            </button>
            {user.role === "admin" && (
              <button onClick={() => { nav("org-setup"); setOpen(false); }} className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl transition-colors">
                <Building2 className="w-4 h-4"/> Organization Setup
              </button>
            )}
            <button onClick={() => { nav("reports"); setOpen(false); }} className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 rounded-xl transition-colors">
              <BarChart3 className="w-4 h-4"/> Reports
            </button>
            <div className="border-t border-slate-100 mt-2 pt-2">
              <button onClick={() => { toast.success("Signed out successfully!"); logout(); }} className="w-full flex items-center gap-3 px-3.5 py-2.5 text-sm text-red-600 hover:bg-red-50 rounded-xl transition-colors font-semibold">
                <LogOut className="w-4 h-4"/> Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {showEdit && (
        <Modal title="Update Profile" subtitle={user.email} onClose={() => setEdit(false)}>
          <div className="space-y-4">
            <div className="flex items-center justify-center mb-2">
              <div className="relative">
                <Av initials={user.avatar} size="lg" color={roleColors[user.role]} />
                <button onClick={() => toast.info("Photo upload feature coming soon!")} className="absolute -bottom-1 -right-1 w-6 h-6 bg-indigo-600 rounded-full flex items-center justify-center border-2 border-white hover:bg-indigo-700 transition-colors">
                  <Camera className="w-3 h-3 text-white"/>
                </button>
              </div>
            </div>
            <Fld label="Full Name"><Inp value={editForm.name} onChange={v=>setEF(p=>({...p,name:v}))} /></Fld>
            <Fld label="Email (read-only)"><Inp value={user.email} readOnly /></Fld>
            <Fld label="Department (read-only)"><Inp value={user.department} readOnly /></Fld>
            <Fld label="Mobile Number"><Inp value={editForm.phone} onChange={v=>setEF(p=>({...p,phone:v}))} placeholder="+91 98765 43210" /></Fld>
            <Fld label="City">
              <Sel value={editForm.city} onChange={v=>setEF(p=>({...p,city:v}))} options={["Mumbai","Pune","Delhi","Bengaluru","Chennai","Kolkata","Hyderabad","Ahmedabad","Jaipur","Surat"].map(c=>({value:c,label:c}))} />
            </Fld>
            <div className="flex items-start gap-3 p-3.5 bg-indigo-50 border border-indigo-200 rounded-xl">
              <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5"/>
              <p className="text-xs text-indigo-700">Only Admin can change role and email — go to Organization Setup.</p>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Btn variant="outline" onClick={() => setEdit(false)}>Cancel</Btn>
              <Btn variant="primary" onClick={saveProfile}><Check className="w-4 h-4"/>Save</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── LOGIN ────────────────────────────────────────────────────────────────────
function LoginScreen({ onLogin, onSignup }: { onLogin:(u:User)=>void; onSignup:()=>void }) {
  const [email,setEmail] = useState("");
  const [pass,setPass]   = useState("");
  const [loading,setLd]  = useState(false);

  const doLogin = () => {
    setLd(true);
    setTimeout(() => {
      const u = DEMO_USERS.find(u=>u.email===email);
      setLd(false);
      if (u) { onLogin(u); toast.success(`Welcome, ${u.name.split(" ")[0]}!`, {description:`Logged in as ${ROLE_LABEL_EN[u.role]}`}); }
      else toast.error("This account was not found.", {description:"Try one of the demo logins below."});
    }, 500);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{background:"linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#1e1b4b 100%)"}}>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-3 mb-3"><Logo size={48}/><span className="text-3xl font-black text-white tracking-tight">AssetFlow</span></div>
          <p className="text-indigo-300 text-sm">Bharat Corp — Asset Management System</p>
          <div className="flex items-center justify-center gap-1.5 mt-2">
            <span className="text-[10px] font-bold text-indigo-400 tracking-widest uppercase">🇮🇳 Made in India</span>
          </div>
        </div>
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-6">Login</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-indigo-200 mb-1.5 uppercase tracking-wide">Email</label>
              <div className="relative"><Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-300"/>
                <input type="email" value={email} onChange={e=>setEmail(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()} placeholder="you@bharat-corp.in"
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-indigo-400/60 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400"/></div>
            </div>
            <div>
              <label className="block text-xs font-bold text-indigo-200 mb-1.5 uppercase tracking-wide">Password</label>
              <div className="relative"><Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-300"/>
                <input type="password" value={pass} onChange={e=>setPass(e.target.value)} onKeyDown={e=>e.key==="Enter"&&doLogin()} placeholder="••••••••"
                  className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-indigo-400/60 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50 focus:border-indigo-400"/></div>
            </div>
            <button onClick={doLogin} disabled={loading} className="w-full py-3 bg-indigo-500 hover:bg-indigo-400 disabled:opacity-60 text-white rounded-xl text-sm font-bold transition-all shadow-lg shadow-indigo-900/50 active:scale-95">
              {loading?"Logging in…":"Login →"}
            </button>
          </div>
          <div className="mt-4 text-center">
            <button onClick={onSignup} className="text-indigo-300 hover:text-indigo-200 text-xs font-semibold transition-colors">Don't have an account? Create one →</button>
          </div>
          <div className="mt-6 pt-5 border-t border-white/10">
            <p className="text-xs text-indigo-300/60 mb-3 font-semibold">Demo login — pick a role:</p>
            <div className="grid grid-cols-2 gap-2">
              {DEMO_USERS.slice(0,4).map(u=>(
                <button key={u.id} onClick={() => { onLogin(u); toast.success(`Welcome, ${u.name.split(" ")[0]}!`); }}
                  className="flex items-center gap-2.5 p-3 rounded-xl bg-white/5 hover:bg-white/15 border border-white/10 hover:border-indigo-400/40 transition-all text-left">
                  <Av initials={u.avatar} size="sm"/>
                  <div className="min-w-0"><div className="text-xs font-bold text-white truncate">{u.name.split(" ")[0]}</div><div className="text-[10px] text-indigo-300">{ROLE_LABEL_EN[u.role]}</div></div>
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── SIGNUP ───────────────────────────────────────────────────────────────────
function SignupScreen({ onBack, onCreate }: { onBack:()=>void; onCreate:(u:User)=>void }) {
  const [name,setName]   = useState("");
  const [email,setEmail] = useState("");
  const [dept,setDept]   = useState(DEPT_NAMES[0]);
  const [city,setCity]   = useState("Mumbai");
  const [pass,setPass]   = useState("");

  const submit = () => {
    if (!name.trim()||!email.trim()||!pass) { toast.error("Please fill in all fields."); return; }
    if (!email.includes("@")) { toast.error("Please enter a valid email."); return; }
    const u: User = { id:`u_${Date.now()}`, name:name.trim(), email:email.trim(), role:"employee", department:dept, avatar:name.trim().split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase(), city };
    toast.success("Account created! Welcome to AssetFlow.", {description:`Logging in as ${name.split(" ")[0]}…`});
    onCreate(u);
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{background:"linear-gradient(135deg,#1e1b4b 0%,#312e81 50%,#1e1b4b 100%)"}}>
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-3 mb-8"><Logo size={44}/><span className="text-3xl font-black text-white tracking-tight">AssetFlow</span></div>
        <div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-3xl p-8 shadow-2xl">
          <h2 className="text-xl font-bold text-white mb-1">Create New Account</h2>
          <p className="text-sm text-indigo-300 mb-6">New accounts get the <strong className="text-white">Employee</strong> role. Admin can promote you later.</p>
          <div className="space-y-4">
            {[{l:"Full Name",t:"text",v:name,s:setName,p:"Rajesh Kumar Sharma"},{l:"Work Email",t:"email",v:email,s:setEmail,p:"you@bharat-corp.in"},{l:"Password",t:"password",v:pass,s:setPass,p:"••••••••"}].map(f=>(
              <div key={f.l}>
                <label className="block text-xs font-bold text-indigo-200 mb-1.5 uppercase tracking-wide">{f.l}</label>
                <input type={f.t} value={f.v} onChange={e=>(f.s as any)(e.target.value)} placeholder={f.p}
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-indigo-400/60 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50"/>
              </div>
            ))}
            <div>
              <label className="block text-xs font-bold text-indigo-200 mb-1.5 uppercase tracking-wide">Department</label>
              <select value={dept} onChange={e=>setDept(e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50">
                {DEPT_NAMES.map(d=><option key={d} value={d} className="text-slate-900">{d}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-indigo-200 mb-1.5 uppercase tracking-wide">City</label>
              <select value={city} onChange={e=>setCity(e.target.value)} className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400/50">
                {["Mumbai","Pune","Delhi","Bengaluru","Chennai","Kolkata","Hyderabad","Ahmedabad","Jaipur"].map(c=><option key={c} value={c} className="text-slate-900">{c}</option>)}
              </select>
            </div>
            <button onClick={submit} className="w-full py-3 bg-indigo-500 hover:bg-indigo-400 text-white rounded-xl text-sm font-bold transition-all active:scale-95">Create Account →</button>
          </div>
          <div className="mt-4 text-center"><button onClick={onBack} className="text-indigo-300 hover:text-indigo-200 text-xs font-semibold transition-colors">← Back to login page</button></div>
        </div>
      </div>
    </div>
  );
}

// ─── DASHBOARD ────────────────────────────────────────────────────────────────
function DashboardScreen({ user, assets, maint, bookings, nav }: { user:User; assets:Asset[]; maint:MaintReq[]; bookings:Booking[]; nav:(s:Screen)=>void }) {
  const available  = assets.filter(a=>a.status==="Available").length;
  const allocated  = assets.filter(a=>a.status==="Allocated").length;
  const inMaint    = assets.filter(a=>a.status==="Under Maintenance").length;
  const pending    = maint.filter(m=>m.status==="Pending").length;
  const activeBook = bookings.filter(b=>b.status==="Upcoming"||b.status==="Ongoing").length;
  const overdue    = assets.filter(a=>a.status==="Allocated"&&a.expectedReturn&&new Date(a.expectedReturn)<new Date()).length;
  const totalValue = assets.reduce((s,a)=>s+a.acquisitionCost,0);
  const utilData   = [{m:"Feb",r:72},{m:"Mar",r:78},{m:"Apr",r:65},{m:"May",r:82},{m:"Jun",r:76},{m:"Jul",r:84}];
  const pieData    = [
    {name:"Available",   value:available, fill:"#10B981"},
    {name:"Allocated",  value:allocated, fill:"#6366F1"},
    {name:"Under Maintenance",   value:inMaint,   fill:"#F97316"},
    {name:"Other",      value:assets.filter(a=>["Lost","Retired","Disposed","Reserved"].includes(a.status)).length, fill:"#94A3B8"},
  ].filter(d=>d.value>0);
  const todayBooks = bookings.filter(b=>b.date==="2024-07-12").sort((a,b)=>a.startTime.localeCompare(b.startTime));

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-900">Hello, {user.name.split(" ")[0]}! 🙏</h1>
          <p className="text-sm text-slate-500 mt-1">{new Date().toLocaleDateString("en-IN",{weekday:"long",year:"numeric",month:"long",day:"numeric"})}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(user.role==="admin"||user.role==="manager")&&<Btn variant="primary" onClick={()=>nav("assets")}><Plus className="w-4 h-4"/>Register Asset</Btn>}
          <Btn variant="outline" onClick={()=>nav("booking")}><Calendar className="w-4 h-4"/>Booking</Btn>
          <Btn variant="outline" onClick={()=>nav("maintenance")}><Wrench className="w-4 h-4"/>Maintenance</Btn>
        </div>
      </div>

      {overdue>0&&(
        <div className="flex items-center gap-4 p-4 bg-red-50 border border-red-200 rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0"><AlertTriangle className="w-5 h-5 text-red-600"/></div>
          <div className="flex-1"><p className="text-sm font-bold text-red-800">{overdue} asset return(s) overdue!</p><p className="text-xs text-red-600 mt-0.5">The scheduled return date has passed — action needed immediately.</p></div>
          <Btn variant="danger" size="xs" onClick={()=>nav("allocation")}>View</Btn>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
        <KPI label="Available"          value={available}  sub="ready to use"  icon={CheckCircle}   color="emerald" onClick={()=>nav("assets")} />
        <KPI label="Allocated"         value={allocated}  sub="currently in use"           icon={UserCheck}     color="indigo"  onClick={()=>nav("allocation")} />
        <KPI label="Active Bookings"  value={activeBook} sub="rooms and resources"   icon={Calendar}      color="blue"    onClick={()=>nav("booking")} />
        <KPI label="Under Maintenance"     value={inMaint}    sub="being repaired"   icon={Wrench}        color="orange"  onClick={()=>nav("maintenance")} />
        <KPI label="Pending Approvals"     value={pending}    sub="action needed"      icon={Clock}         color="amber"   onClick={()=>nav("maintenance")} />
        <KPI label="Total Value"        value={INR_K(totalValue)} sub="asset value" icon={IndianRupee} color="emerald" onClick={()=>nav("reports")} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div><h3 className="text-sm font-bold text-slate-900">Asset Utilization Trend</h3><p className="text-xs text-slate-400 mt-0.5">Over the last 6 months</p></div>
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">↑ 8% this month</span>
          </div>
          <ResponsiveContainer width="100%" height={155}>
            <AreaChart data={utilData}>
              <defs><linearGradient id="dash-ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366F1" stopOpacity={0.2}/><stop offset="100%" stopColor="#6366F1" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="m" tick={{fontSize:11,fill:"#94A3B8",fontWeight:600}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:11,fill:"#94A3B8"}} axisLine={false} tickLine={false} unit="%" domain={[50,100]}/>
              <Tooltip contentStyle={{borderRadius:10,border:"1px solid #E2E8F0",fontSize:12}}/>
              <Area type="monotone" dataKey="r" name="Utilization %" stroke="#6366F1" strokeWidth={2.5} fill="url(#dash-ag)"/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Status Distribution</h3>
          <ResponsiveContainer width="100%" height={130}>
            <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={40} outerRadius={62} dataKey="value" paddingAngle={3}/><Tooltip contentStyle={{borderRadius:10,border:"1px solid #E2E8F0",fontSize:12}}/></PieChart>
          </ResponsiveContainer>
          <div className="space-y-2 mt-2">
            {pieData.map(d=>(
              <div key={d.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full" style={{background:d.fill}}/><span className="text-xs font-medium text-slate-600">{d.name}</span></div>
                <span className="text-xs font-black text-slate-800">{d.value}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Recent Activity</h3>
            <Btn variant="ghost" size="xs" onClick={()=>nav("notifications")}>View All <ChevronRight className="w-3.5 h-3.5"/></Btn>
          </div>
          <div className="space-y-3">
            {ACTIVITY_LOG.slice(0,5).map((a,i)=>(
              <div key={i} className="flex items-start gap-3">
                <Av initials={a.user.split(" ").map(w=>w[0]).join("")} size="sm"/>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700 leading-relaxed"><span className="font-bold">{a.user.split(" ")[0]}</span>{" "}<span className="text-indigo-600 font-semibold">{a.action}</span>{" "}<span className="font-semibold text-slate-600">{a.target}</span></p>
                  <p className="text-[10px] text-slate-400 mt-0.5">{a.detail} · {a.time}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-slate-900">Today's Bookings</h3>
            <Btn variant="ghost" size="xs" onClick={()=>nav("booking")}>View All <ChevronRight className="w-3.5 h-3.5"/></Btn>
          </div>
          {todayBooks.length===0
            ? <Empty icon={Calendar} title="No bookings today" desc="No resources are booked for today."/>
            : <div className="space-y-2">{todayBooks.map(b=>(
              <div key={b.id} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 hover:bg-indigo-50 transition-colors border border-slate-100">
                <div className="text-center shrink-0 w-16"><div className="text-xs font-bold text-indigo-700 font-mono">{b.startTime}</div><div className="text-[10px] text-slate-400">–{b.endTime}</div></div>
                <div className="flex-1 min-w-0"><p className="text-xs font-semibold text-slate-900 truncate">{b.resourceName}</p><p className="text-[10px] text-slate-500 truncate">{b.purpose}</p></div>
                <BBadge status={b.status}/>
              </div>
            ))}</div>}
        </Card>
      </div>
    </div>
  );
}

// ─── ASSET REGISTRY ───────────────────────────────────────────────────────────
function AssetRegistryScreen({ user, assets, setAssets, nav, setDetailId }: { user:User; assets:Asset[]; setAssets:(a:Asset[])=>void; nav:(s:Screen)=>void; setDetailId:(id:string)=>void }) {
  const [q,setQ]       = useState("");
  const [stF,setStF]   = useState<AssetStatus|"">("");
  const [catF,setCatF] = useState("");
  const [showReg,setReg] = useState(false);
  const [form,setForm] = useState({ name:"", category:CAT_NAMES[0], department:DEPT_NAMES[0], location:"", serial:"", cost:"", condition:"Good" as Condition, bookable:false, notes:"" });

  const filtered = useMemo(()=>assets.filter(a=>{
    const sq=q.toLowerCase();
    return (!sq||a.name.toLowerCase().includes(sq)||a.tag.toLowerCase().includes(sq)||a.serialNumber.toLowerCase().includes(sq))
        && (!stF||a.status===stF) && (!catF||a.category===catF);
  }),[assets,q,stF,catF]);

  const doRegister = () => {
    if (!form.name.trim()) { toast.error("Asset name is required."); return; }
    const tag=`BHC-${String(assets.length+1).padStart(4,"0")}`;
    const a: Asset={ id:`a_${Date.now()}`, tag, name:form.name.trim(), category:form.category, status:"Available", location:form.location||"Unspecified", department:form.department, serialNumber:form.serial||"N/A", acquisitionDate:new Date().toISOString().split("T")[0], acquisitionCost:parseFloat(form.cost)||0, condition:form.condition, bookable:form.bookable, notes:form.notes };
    setAssets([...assets,a]);
    toast.success(`"${form.name}" registered as ${tag}!`, {description:"Now available in the Asset Directory."});
    setReg(false);
    setForm({name:"",category:CAT_NAMES[0],department:DEPT_NAMES[0],location:"",serial:"",cost:"",condition:"Good",bookable:false,notes:""});
  };

  const condClr=(c:Condition)=>({Excellent:"text-emerald-600",Good:"text-blue-600",Fair:"text-amber-600",Poor:"text-red-600"}[c]);

  return (
    <div className="p-6 space-y-5 max-w-screen-xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-black text-slate-900">Asset Directory</h1><p className="text-sm text-slate-500">{assets.length} total · showing {filtered.length}</p></div>
        {(user.role==="admin"||user.role==="manager")&&<Btn variant="primary" onClick={()=>setReg(true)}><Plus className="w-4 h-4"/>Register Asset</Btn>}
      </div>
      <Card className="p-4">
        <div className="flex flex-wrap gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400"/>
            <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Name, tag, serial number…" className="w-full pl-10 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 focus:border-indigo-400"/>
          </div>
          <select value={stF} onChange={e=>setStF(e.target.value as AssetStatus|"")} className="px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400/40 min-w-[140px]">
            <option value="">All Statuses</option>
            {(["Available","Allocated","Reserved","Under Maintenance","Lost","Retired","Disposed"] as AssetStatus[]).map(s=><option key={s} value={s}>{SC[s].label}</option>)}
          </select>
          <select value={catF} onChange={e=>setCatF(e.target.value)} className="px-3.5 py-2.5 text-sm border border-slate-200 rounded-xl bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-400/40">
            <option value="">All Categories</option>
            {CAT_NAMES.map(c=><option key={c} value={c}>{c}</option>)}
          </select>
          {(q||stF||catF)&&<Btn variant="ghost" onClick={()=>{setQ("");setStF("");setCatF("");}}><X className="w-4 h-4"/>Clear</Btn>}
        </div>
      </Card>
      <Card>
        <div className="overflow-x-auto rounded-2xl">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100 bg-slate-50/50">{["Asset","Tag","Category","Status","Department","Assigned To","Condition"].map(h=><th key={h} className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wide whitespace-nowrap">{h}</th>)}</tr></thead>
            <tbody>
              {filtered.length===0
                ? <tr><td colSpan={7} className="py-16"><Empty icon={Package} title="No assets found" desc="Try changing your search or filters."/></td></tr>
                : filtered.map(a=>(
                  <tr key={a.id} className="border-b border-slate-50 hover:bg-indigo-50/50 cursor-pointer transition-colors group" onClick={()=>{setDetailId(a.id);nav("asset-detail");}}>
                    <td className="px-4 py-3.5"><div className="font-semibold text-slate-900 group-hover:text-indigo-700 transition-colors">{a.name}</div><div className="text-xs text-slate-400 font-mono mt-0.5">{a.serialNumber}</div></td>
                    <td className="px-4 py-3.5"><span className="font-mono text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-lg font-bold">{a.tag}</span></td>
                    <td className="px-4 py-3.5 text-xs text-slate-600 font-medium max-w-[120px] truncate">{a.category}</td>
                    <td className="px-4 py-3.5"><SBadge status={a.status}/></td>
                    <td className="px-4 py-3.5 text-xs text-slate-600">{a.department}</td>
                    <td className="px-4 py-3.5">{a.assignedTo?<div className="flex items-center gap-1.5"><Av initials={a.assignedTo.split(" ").map(w=>w[0]).join("")} size="xs"/><span className="text-xs font-medium text-slate-700">{a.assignedTo.split(" ")[0]}</span></div>:<span className="text-slate-300 text-xs">—</span>}</td>
                    <td className="px-4 py-3.5"><span className={clsx("text-xs font-bold",condClr(a.condition))}>{a.condition}</span></td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </Card>
      {showReg&&(
        <Modal title="Register New Asset" subtitle="Tag will be auto-generated" onClose={()=>setReg(false)} width="max-w-2xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2"><Fld label="Asset Name *"><Inp value={form.name} onChange={v=>setForm(p=>({...p,name:v}))} placeholder='e.g. Dell Latitude 5540 Laptop'/></Fld></div>
            <Fld label="Category"><Sel value={form.category} onChange={v=>setForm(p=>({...p,category:v}))} options={CAT_NAMES.map(c=>({value:c,label:c}))}/></Fld>
            <Fld label="Department"><Sel value={form.department} onChange={v=>setForm(p=>({...p,department:v}))} options={DEPT_NAMES.map(d=>({value:d,label:d}))}/></Fld>
            <Fld label="Location"><Inp value={form.location} onChange={v=>setForm(p=>({...p,location:v}))} placeholder="e.g. 3rd Floor, IT Wing, Mumbai"/></Fld>
            <Fld label="Serial Number"><Inp value={form.serial} onChange={v=>setForm(p=>({...p,serial:v}))} placeholder="SN-XXXXXXXX"/></Fld>
            <Fld label="Cost (₹)"><Inp value={form.cost} onChange={v=>setForm(p=>({...p,cost:v}))} placeholder="0" type="number"/></Fld>
            <Fld label="Condition"><Sel value={form.condition} onChange={v=>setForm(p=>({...p,condition:v as Condition}))} options={["Excellent","Good","Fair","Poor"].map(c=>({value:c,label:c}))}/></Fld>
            <div className="sm:col-span-2"><Fld label="Notes"><Txtarea value={form.notes} onChange={v=>setForm(p=>({...p,notes:v}))} placeholder="Additional details…" rows={2}/></Fld></div>
            <div className="sm:col-span-2">
              <label className="flex items-center gap-3 p-4 rounded-xl bg-indigo-50 border border-indigo-200 cursor-pointer hover:bg-indigo-100 transition-colors" onClick={()=>setForm(p=>({...p,bookable:!p.bookable}))}>
                <div className={clsx("w-5 h-5 rounded flex items-center justify-center border-2 transition-colors",form.bookable?"bg-indigo-600 border-indigo-600":"border-slate-300")}>{form.bookable&&<Check className="w-3 h-3 text-white"/>}</div>
                <div><p className="text-sm font-semibold text-indigo-800">Mark as a bookable resource</p><p className="text-xs text-indigo-600">Employees will be able to book this asset (rooms, projectors, vehicles)</p></div>
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 mt-5 pt-4 border-t border-slate-100">
            <Btn variant="outline" onClick={()=>setReg(false)}>Cancel</Btn>
            <Btn variant="primary" onClick={doRegister}><Plus className="w-4 h-4"/>Register</Btn>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── ASSET DETAIL ─────────────────────────────────────────────────────────────
function AssetDetailScreen({ asset, user, maint, nav, assets, setAssets }: { asset:Asset; user:User; maint:MaintReq[]; nav:(s:Screen)=>void; assets:Asset[]; setAssets:(a:Asset[])=>void }) {
  const [tab,setTab]     = useState<"overview"|"maintenance">("overview");
  const [editing,setEd]  = useState(false);
  const [editF,setEF]    = useState({ name:asset.name, location:asset.location, condition:asset.condition, notes:asset.notes||"", status:asset.status });
  const assetMaint = maint.filter(m=>m.assetId===asset.id);

  const saveEdit = () => {
    setAssets(assets.map(a=>a.id===asset.id?{...a,name:editF.name,location:editF.location,condition:editF.condition as Condition,notes:editF.notes,status:editF.status as AssetStatus}:a));
    toast.success("Asset information updated!");
    setEd(false);
  };

  return (
    <div className="p-6 space-y-5 max-w-screen-xl mx-auto">
      <button onClick={()=>nav("assets")} className="flex items-center gap-2 text-sm font-semibold text-slate-500 hover:text-indigo-700 transition-colors"><ChevronLeft className="w-4 h-4"/>Back to list</button>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex flex-wrap items-center gap-3 mb-2">
            <h1 className="text-2xl font-black text-slate-900">{asset.name}</h1>
            <SBadge status={asset.status}/>
            {asset.bookable&&<span className="text-xs font-bold bg-indigo-100 text-indigo-700 border border-indigo-200 px-2.5 py-0.5 rounded-full">Bookable</span>}
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <span className="font-mono text-sm font-bold text-indigo-700 bg-indigo-50 px-3 py-1 rounded-lg border border-indigo-200">{asset.tag}</span>
            <span className="text-sm text-slate-500">SN: {asset.serialNumber}</span>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {(user.role==="admin"||user.role==="manager")&&<Btn variant="outline" onClick={()=>setEd(true)}><Edit className="w-4 h-4"/>Edit</Btn>}
          {(user.role==="admin"||user.role==="manager")&&<Btn variant="primary" onClick={()=>nav("allocation")}><UserCheck className="w-4 h-4"/>Allocate</Btn>}
          <Btn variant="secondary" onClick={()=>nav("maintenance")}><Wrench className="w-4 h-4"/>Maintenance</Btn>
        </div>
      </div>
      <div className="flex gap-0 border-b-2 border-slate-100">
        {(["overview","maintenance"] as const).map(t=>(
          <button key={t} onClick={()=>setTab(t)} className={clsx("px-5 py-2.5 text-sm font-bold capitalize transition-all border-b-2 -mb-[2px]",tab===t?"border-indigo-600 text-indigo-700":"border-transparent text-slate-500 hover:text-slate-700")}>
            {t==="overview"?"Overview":"Maintenance History"}
            {t==="maintenance"&&assetMaint.length>0&&<span className="ml-1.5 text-xs bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded-full">{assetMaint.length}</span>}
          </button>
        ))}
      </div>
      {tab==="overview"&&(
        <Card className="p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-5">Asset Information</h3>
          <div className="grid grid-cols-2 gap-x-8 gap-y-5">
            {[
              {l:"Location",       v:asset.location},
              {l:"Department",       v:asset.department},
              {l:"Condition",      v:asset.condition},
              {l:"Category",       v:asset.category},
              {l:"Acquisition Date",v:new Date(asset.acquisitionDate).toLocaleDateString("en-IN",{year:"numeric",month:"long",day:"numeric"})},
              {l:"Acquisition Cost", v:INR(asset.acquisitionCost)},
              {l:"Assigned To",   v:asset.assignedTo||"Not assigned"},
              {l:"Expected Return", v:asset.expectedReturn?new Date(asset.expectedReturn).toLocaleDateString("en-IN"):"Not set"},
            ].map(({l,v})=>(
              <div key={l}><p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">{l}</p><p className="text-sm font-semibold text-slate-900">{v}</p></div>
            ))}
            {asset.notes&&<div className="col-span-2"><p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-1">Notes</p><p className="text-sm text-slate-700 bg-slate-50 rounded-xl p-3 border border-slate-100">{asset.notes}</p></div>}
          </div>
        </Card>
      )}
      {tab==="maintenance"&&(
        <Card className="p-6">
          <h3 className="text-sm font-bold text-slate-900 mb-5">Maintenance History</h3>
          {assetMaint.length===0
            ? <Empty icon={Wrench} title="No maintenance history" desc="No requests have been raised for this asset." action={<Btn variant="secondary" size="xs" onClick={()=>nav("maintenance")}><Plus className="w-3.5 h-3.5"/>Raise Request</Btn>}/>
            : <div className="space-y-3">{assetMaint.map(m=>(
              <div key={m.id} className="p-4 rounded-xl border border-slate-100 bg-slate-50">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-2"><div className="flex items-center gap-2"><PBadge priority={m.priority}/><MBadge status={m.status}/></div><span className="text-xs text-slate-400">{m.requestedDate}</span></div>
                <p className="text-sm font-medium text-slate-800">{m.issue}</p>
                {m.notes&&<p className="text-xs text-slate-500 mt-1.5 italic border-l-2 border-slate-200 pl-2">{m.notes}</p>}
              </div>
            ))}</div>}
        </Card>
      )}
      {editing&&(
        <Modal title="Edit Asset" subtitle={asset.tag} onClose={()=>setEd(false)} width="max-w-xl">
          <div className="space-y-4">
            <Fld label="Asset Name"><Inp value={editF.name} onChange={v=>setEF(p=>({...p,name:v}))}/></Fld>
            <Fld label="Location"><Inp value={editF.location} onChange={v=>setEF(p=>({...p,location:v}))}/></Fld>
            <div className="grid grid-cols-2 gap-3">
              <Fld label="Condition"><Sel value={editF.condition} onChange={v=>setEF(p=>({...p,condition:v}))} options={["Excellent","Good","Fair","Poor"].map(c=>({value:c,label:c}))}/></Fld>
              {(user.role==="admin"||user.role==="manager")&&(
                <Fld label="Status"><Sel value={editF.status} onChange={v=>setEF(p=>({...p,status:v}))} options={(["Available","Allocated","Reserved","Under Maintenance","Lost","Retired","Disposed"] as AssetStatus[]).map(s=>({value:s,label:SC[s].label}))}/></Fld>
              )}
            </div>
            <Fld label="Notes"><Txtarea value={editF.notes} onChange={v=>setEF(p=>({...p,notes:v}))} placeholder="Additional details…"/></Fld>
            <div className="flex justify-end gap-3 pt-2">
              <Btn variant="outline" onClick={()=>setEd(false)}>Cancel</Btn>
              <Btn variant="primary" onClick={saveEdit}><Check className="w-4 h-4"/>Save</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── ALLOCATION ───────────────────────────────────────────────────────────────
function AllocationScreen({ user, assets, setAssets }: { user:User; assets:Asset[]; setAssets:(a:Asset[])=>void }) {
  const [tab,setTab]     = useState<"new"|"active"|"returns">("new");
  const [step,setStep]   = useState(0);
  const [selA,setSelA]   = useState<Asset|null>(null);
  const [selU,setSelU]   = useState<User|null>(null);
  const [retDate,setRet] = useState("");
  const [conflict,setConf] = useState(false);
  const [retCond,setRetCond] = useState<Condition>("Good");

  const available = assets.filter(a=>a.status==="Available");
  const allocated = assets.filter(a=>a.status==="Allocated");

  const pickAsset = (a: Asset) => {
    setSelA(a);
    if (a.status==="Allocated") { setConf(true); }
    else { setConf(false); setStep(1); }
  };

  const doAllocate = () => {
    if (!selA||!selU) return;
    setAssets(assets.map(a=>a.id===selA.id?{...a,status:"Allocated",assignedTo:selU.name,assignedToId:selU.id,expectedReturn:retDate||undefined}:a));
    toast.success(`${selA.name} allocated to ${selU.name.split(" ")[0]}!`, {description:"Notification sent."});
    setStep(3);
    setTimeout(()=>{setStep(0);setSelA(null);setSelU(null);setRet("");setConf(false);},3000);
  };

  const doReturn = (a: Asset) => {
    setAssets(assets.map(x=>x.id===a.id?{...x,status:"Available",assignedTo:undefined,assignedToId:undefined,expectedReturn:undefined}:x));
    toast.success(`${a.name} returned — now Available!`, {description:`Condition: ${retCond}`});
  };

  return (
    <div className="p-6 space-y-5 max-w-screen-xl mx-auto">
      <div><h1 className="text-2xl font-black text-slate-900">Asset Allocation</h1><p className="text-sm text-slate-500">Assign, transfer, and process returns</p></div>
      <div className="flex gap-0 border-b-2 border-slate-100">
        {([["new","New Allocation"],["active","Active ("+allocated.length+")"],["returns","Process Return"]] as const).map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} className={clsx("px-5 py-2.5 text-sm font-bold transition-all border-b-2 -mb-[2px]",tab===t?"border-indigo-600 text-indigo-700":"border-transparent text-slate-500 hover:text-slate-700")}>{l}</button>
        ))}
      </div>
      {tab==="new"&&(
        <Card className="p-6">
          <div className="flex justify-center mb-8"><Steps steps={["Select Asset","Select Employee","Confirm","Done"]} current={step}/></div>
          {step===0&&(
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Select an asset to allocate</h3>
              <p className="text-xs text-slate-400 mb-4">Available assets can be allocated directly.</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-5">
                {available.map(a=>(
                  <button key={a.id} onClick={()=>pickAsset(a)} className={clsx("p-4 rounded-xl border text-left transition-all hover:shadow-sm",selA?.id===a.id?"border-indigo-400 bg-indigo-50":"border-slate-200 bg-white hover:border-indigo-200")}>
                    <div className="flex items-center justify-between mb-2"><span className="font-mono text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">{a.tag}</span><SBadge status={a.status}/></div>
                    <p className="text-sm font-bold text-slate-900">{a.name}</p>
                    <p className="text-xs text-slate-400 mt-0.5">{a.location}</p>
                  </button>
                ))}
              </div>
              {available.length===0&&<Empty icon={Package} title="No assets available" desc="All assets are currently allocated."/>}
              {conflict&&selA&&(
                <div className="mt-5 p-5 bg-amber-50 border border-amber-200 rounded-2xl">
                  <div className="flex items-start gap-4"><div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0"><AlertTriangle className="w-5 h-5 text-amber-600"/></div>
                    <div className="flex-1">
                      <p className="text-sm font-bold text-amber-900 mb-1">Conflict — Asset Already Allocated</p>
                      <p className="text-sm text-amber-800"><strong>{selA.name}</strong> is currently held by <strong>{selA.assignedTo}</strong>. Send a Transfer Request to re-assign it.</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2 mt-4">
                    <Btn variant="primary" size="xs" onClick={()=>{toast.success(`Transfer request sent for ${selA.name}.`,{description:"Notification sent to the manager."});setConf(false);setSelA(null);}}><Send className="w-3.5 h-3.5"/>Send Transfer Request</Btn>
                    <Btn variant="outline" size="xs" onClick={()=>{setConf(false);setSelA(null);}}>Choose Another</Btn>
                  </div>
                </div>
              )}
            </div>
          )}
          {step===1&&(
            <div>
              <h3 className="text-sm font-bold text-slate-900 mb-1">Select an employee</h3>
              <p className="text-xs text-slate-400 mb-4">Asset: <strong>{selA?.name}</strong> ({selA?.tag})</p>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-5">
                {DEMO_USERS.map(u=>(
                  <button key={u.id} onClick={()=>setSelU(u)} className={clsx("p-4 rounded-xl border text-left transition-all",selU?.id===u.id?"border-indigo-400 bg-indigo-50":"border-slate-200 bg-white hover:border-indigo-200")}>
                    <Av initials={u.avatar} size="sm"/>
                    <p className="text-xs font-bold text-slate-900 mt-2 truncate">{u.name.split(" ")[0]}</p>
                    <p className="text-[10px] text-slate-400">{u.city}</p>
                    <div className="mt-1"><RBadge role={u.role}/></div>
                  </button>
                ))}
              </div>
              <div className="max-w-xs mb-5"><Fld label="Expected Return Date (optional)"><Inp value={retDate} onChange={setRet} type="date"/></Fld></div>
              <div className="flex gap-3">
                <Btn variant="outline" onClick={()=>setStep(0)}><ChevronLeft className="w-4 h-4"/>Back</Btn>
                <Btn variant="primary" onClick={()=>selU&&setStep(2)} disabled={!selU}>Next <ChevronRight className="w-4 h-4"/></Btn>
              </div>
            </div>
          )}
          {step===2&&selA&&selU&&(
            <div className="max-w-md mx-auto">
              <h3 className="text-sm font-bold text-slate-900 mb-4">Confirm allocation details</h3>
              <div className="p-5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3 mb-5">
                {[{l:"Asset",v:`${selA.name} (${selA.tag})`},{l:"Currently Held By",v:selA.assignedTo||"—"},{l:"Assigning To",v:selU.name},{l:"Department",v:selU.department},{l:"Value",v:INR(selA.acquisitionCost)},{l:"Return Date",v:retDate?new Date(retDate).toLocaleDateString("en-IN"):"Not set"}].map(({l,v})=>(
                  <div key={l} className="flex justify-between text-sm border-b border-slate-200 pb-2 last:border-0 last:pb-0"><span className="text-slate-500">{l}</span><span className="font-bold text-slate-900">{v}</span></div>
                ))}
              </div>
              <div className="flex gap-3">
                <Btn variant="outline" onClick={()=>setStep(1)}><ChevronLeft className="w-4 h-4"/>Back</Btn>
                <Btn variant="primary" onClick={doAllocate}><Check className="w-4 h-4"/>Confirm Allocation</Btn>
              </div>
            </div>
          )}
          {step===3&&(
            <div className="text-center py-12">
              <div className="w-16 h-16 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4"><CheckCircle className="w-8 h-8 text-emerald-600"/></div>
              <h3 className="text-lg font-black text-slate-900">Allocation Successful!</h3>
              <p className="text-sm text-slate-500 mt-1">The asset has been assigned and a notification was sent.</p>
            </div>
          )}
        </Card>
      )}
      {tab==="active"&&(
        <Card>
          <div className="overflow-x-auto rounded-2xl">
            <table className="w-full text-sm">
              <thead><tr className="border-b border-slate-100 bg-slate-50/50">{["Asset","Tag","Employee","Department","Return Date","Status","Action"].map(h=><th key={h} className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>)}</tr></thead>
              <tbody>
                {allocated.length===0
                  ? <tr><td colSpan={7} className="py-16"><Empty icon={UserCheck} title="No active allocations" desc="All assets have been returned."/></td></tr>
                  : allocated.map(a=>{
                    const od=a.expectedReturn&&new Date(a.expectedReturn)<new Date();
                    return (
                      <tr key={a.id} className={clsx("border-b border-slate-50 hover:bg-slate-50 transition-colors",od&&"bg-red-50/40")}>
                        <td className="px-4 py-3.5 font-semibold text-slate-900">{a.name}</td>
                        <td className="px-4 py-3.5"><span className="font-mono text-xs font-bold bg-slate-100 px-2.5 py-1 rounded-lg">{a.tag}</span></td>
                        <td className="px-4 py-3.5"><div className="flex items-center gap-2"><Av initials={(a.assignedTo||"?").split(" ").map(w=>w[0]).join("")} size="xs"/><span className="text-sm font-medium">{a.assignedTo?.split(" ")[0]}</span></div></td>
                        <td className="px-4 py-3.5 text-sm text-slate-600">{a.department}</td>
                        <td className="px-4 py-3.5">{a.expectedReturn?<span className={clsx("text-sm font-semibold",od?"text-red-600":"text-slate-700")}>{new Date(a.expectedReturn).toLocaleDateString("en-IN")}{od&&<span className="ml-1 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full">Overdue</span>}</span>:<span className="text-slate-300">—</span>}</td>
                        <td className="px-4 py-3.5"><SBadge status={a.status}/></td>
                        <td className="px-4 py-3.5"><Btn variant="outline" size="xs" onClick={()=>setTab("returns")}>Return</Btn></td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
      {tab==="returns"&&(
        <div className="space-y-3">
          {allocated.length===0
            ? <Card><div className="p-6"><Empty icon={Package} title="Nothing to return" desc="No assets are currently allocated."/></div></Card>
            : allocated.map(a=>(
              <Card key={a.id} className="p-5 flex flex-wrap items-center gap-4">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-3 mb-1"><p className="text-sm font-bold text-slate-900">{a.name}</p><span className="font-mono text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">{a.tag}</span></div>
                  <p className="text-xs text-slate-500">Held by: <strong>{a.assignedTo?.split(" ")[0]}</strong> · {a.department}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Value: {INR(a.acquisitionCost)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <select value={retCond} onChange={e=>setRetCond(e.target.value as Condition)} className="px-3 py-2 text-xs border border-slate-200 rounded-lg bg-slate-50">
                    {["Excellent","Good","Fair","Poor"].map(c=><option key={c} value={c}>{c} condition</option>)}
                  </select>
                  <Btn variant="primary" size="xs" onClick={()=>doReturn(a)}><RotateCcw className="w-3.5 h-3.5"/>Process Return</Btn>
                </div>
              </Card>
            ))}
        </div>
      )}
    </div>
  );
}

// ─── BOOKING ──────────────────────────────────────────────────────────────────
function BookingScreen({ user, assets, bookings, setBookings }: { user:User; assets:Asset[]; bookings:Booking[]; setBookings:(b:Booking[])=>void }) {
  const bookable = assets.filter(a=>a.bookable&&a.status!=="Under Maintenance");
  const [selR,setSelR]   = useState<Asset|null>(bookable[0]||null);
  const [date,setDate]   = useState("2024-07-12");
  const [show,setShow]   = useState(false);
  const [form,setForm]   = useState({ resourceId:bookable[0]?.id||"", date:"2024-07-12", start:"09:00", end:"10:00", purpose:"" });
  const hours = Array.from({length:13},(_,i)=>`${String(i+7).padStart(2,"0")}:00`);
  const resBooks = bookings.filter(b=>selR&&b.resourceId===selR.id);

  const conflict=(rid:string,d:string,s:string,e:string)=>bookings.find(b=>b.resourceId===rid&&b.date===d&&b.status!=="Cancelled"&&!(e<=b.startTime||s>=b.endTime));

  const doBook=()=>{
    const res=assets.find(a=>a.id===form.resourceId);
    if (!res||!form.purpose.trim()){toast.error("Please fill in all fields.");return;}
    if (form.start>=form.end){toast.error("End time must be after start time.");return;}
    const c=conflict(form.resourceId,form.date,form.start,form.end);
    if (c){toast.error(`Conflict! ${res.name} is already booked ${c.startTime}–${c.endTime}.`,{description:`Try again after ${c.endTime}.`});return;}
    const nb:Booking={id:`b_${Date.now()}`,resourceId:form.resourceId,resourceName:res.name,bookedBy:user.name,bookedById:user.id,date:form.date,startTime:form.start,endTime:form.end,status:"Upcoming",purpose:form.purpose,department:user.department};
    setBookings([...bookings,nb]);
    toast.success(`${res.name} booked!`,{description:`${form.date}, ${form.start}–${form.end}`});
    setShow(false);
    setForm(p=>({...p,purpose:""}));
  };

  return (
    <div className="p-6 space-y-5 max-w-screen-xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-black text-slate-900">Resource Booking</h1><p className="text-sm text-slate-500">Reserve rooms and shared assets</p></div>
        <Btn variant="primary" onClick={()=>{setForm(p=>({...p,resourceId:selR?.id||""}));setShow(true);}}><Plus className="w-4 h-4"/>New Booking</Btn>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {bookable.map(a=>(
          <button key={a.id} onClick={()=>setSelR(a)} className={clsx("shrink-0 px-5 py-3.5 rounded-2xl border text-left transition-all min-w-[180px]",selR?.id===a.id?"border-indigo-400 bg-indigo-50 shadow-sm":"border-slate-200 bg-white hover:border-indigo-200")}>
            <div className="flex items-center gap-2 mb-2"><Building2 className="w-4 h-4 text-indigo-400"/><SBadge status={a.status}/></div>
            <p className="text-sm font-bold text-slate-900">{a.name}</p>
            <p className="text-xs text-slate-400 mt-0.5">{a.location}</p>
          </button>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-end gap-3">
            <div className="w-44"><Fld label="Date"><Inp value={date} onChange={setDate} type="date"/></Fld></div>
            {selR&&<p className="text-xs text-slate-400 pb-2.5">Timeline · <strong className="text-slate-700">{selR.name}</strong></p>}
          </div>
          {selR&&(
            <Card className="p-4">
              <div className="space-y-1">
                {hours.map(h=>{
                  const bk=resBooks.find(b=>b.date===date&&b.startTime<=h&&b.endTime>h&&b.status!=="Cancelled");
                  return (
                    <div key={h} className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-slate-400 w-12 shrink-0">{h}</span>
                      <div className={clsx("flex-1 h-9 rounded-xl flex items-center px-3.5 text-xs font-medium border transition-all",bk?"bg-indigo-100 border-indigo-200":"bg-slate-50 border-slate-100 hover:bg-indigo-50/40")}>
                        {bk&&<div className="flex items-center gap-2 w-full">
                          <span className="text-indigo-700 font-semibold truncate">{bk.purpose}</span>
                          <span className="text-indigo-400 ml-auto shrink-0">{bk.bookedBy.split(" ")[0]}</span>
                          <BBadge status={bk.status}/>
                        </div>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </Card>
          )}
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 mb-3">All Bookings</h3>
          <div className="space-y-2">
            {bookings.sort((a,b)=>a.date.localeCompare(b.date)).map(b=>(
              <Card key={b.id} className="p-3.5">
                <div className="flex items-start justify-between gap-2 mb-1"><p className="text-xs font-bold text-slate-900 truncate">{b.resourceName}</p><BBadge status={b.status}/></div>
                <p className="text-[10px] text-slate-500 truncate">{b.purpose}</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <span className="text-[10px] font-mono font-bold text-indigo-700">{b.startTime}–{b.endTime}</span>
                  <span className="text-slate-300">·</span>
                  <span className="text-[10px] text-slate-400">{b.date}</span>
                </div>
                {b.status==="Upcoming"&&b.bookedById===user.id&&(
                  <button className="mt-2 text-[10px] font-bold text-red-600 hover:text-red-700 transition-colors"
                    onClick={()=>{setBookings(bookings.map(bk=>bk.id===b.id?{...bk,status:"Cancelled"}:bk));toast.success("Booking cancelled.",{description:`${b.resourceName} is now available.`});}}>
                    Cancel ×
                  </button>
                )}
              </Card>
            ))}
          </div>
        </div>
      </div>
      {show&&(
        <Modal title="New Booking" subtitle="Conflicts are detected automatically" onClose={()=>setShow(false)}>
          <div className="space-y-4">
            <Fld label="Resource *"><Sel value={form.resourceId} onChange={v=>setForm(p=>({...p,resourceId:v}))} options={[{value:"",label:"Select a resource…"},...bookable.map(a=>({value:a.id,label:a.name}))]}/></Fld>
            <Fld label="Date"><Inp value={form.date} onChange={v=>setForm(p=>({...p,date:v}))} type="date"/></Fld>
            <div className="grid grid-cols-2 gap-3">
              <Fld label="Start Time"><Inp value={form.start} onChange={v=>setForm(p=>({...p,start:v}))} type="time"/></Fld>
              <Fld label="End Time"><Inp value={form.end} onChange={v=>setForm(p=>({...p,end:v}))} type="time"/></Fld>
            </div>
            <Fld label="Purpose *"><Inp value={form.purpose} onChange={v=>setForm(p=>({...p,purpose:v}))} placeholder="e.g. Quarterly Policy Meeting"/></Fld>
            {form.resourceId&&form.start<form.end&&conflict(form.resourceId,form.date,form.start,form.end)&&(()=>{
              const c=conflict(form.resourceId,form.date,form.start,form.end)!;
              return (<div className="flex items-start gap-3 p-3.5 bg-red-50 border border-red-200 rounded-xl"><AlertTriangle className="w-4 h-4 text-red-500 shrink-0 mt-0.5"/><p className="text-xs text-red-700 font-medium">This slot is already booked ({c.startTime}–{c.endTime}). Try again after <strong>{c.endTime}</strong>.</p></div>);
            })()}
            <div className="flex justify-end gap-3 pt-2">
              <Btn variant="outline" onClick={()=>setShow(false)}>Cancel</Btn>
              <Btn variant="primary" onClick={doBook}><Calendar className="w-4 h-4"/>Confirm Booking</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── MAINTENANCE ──────────────────────────────────────────────────────────────
function MaintenanceScreen({ user, assets, maint, setMaint, setAssets }: { user:User; assets:Asset[]; maint:MaintReq[]; setMaint:(m:MaintReq[])=>void; setAssets:(a:Asset[])=>void }) {
  const [filter,setFilter] = useState<MaintStatus|"">("");
  const [show,setShow]     = useState(false);
  const [form,setForm]     = useState({ assetId:"", issue:"", priority:"Medium" as Priority });

  const shown = filter?maint.filter(m=>m.status===filter):maint;
  const canApprove = user.role==="admin"||user.role==="manager";
  const MSTEPS: MaintStatus[] = ["Pending","Approved","Technician Assigned","In Progress","Resolved"];
  const NEXT: Partial<Record<MaintStatus,MaintStatus>> = { Pending:"Approved","Approved":"Technician Assigned","Technician Assigned":"In Progress","In Progress":"Resolved" };
  const NXT_LBL: Partial<Record<MaintStatus,string>> = { Approved:"Assign Technician","Technician Assigned":"Mark In Progress","In Progress":"Mark Resolved" };

  const advance = (req: MaintReq) => {
    const next=NEXT[req.status]; if (!next) return;
    setMaint(maint.map(m=>m.id===req.id?{...m,status:next,approvedBy:next==="Approved"?user.name:m.approvedBy}:m));
    if (next==="Approved"){setAssets(assets.map(a=>a.id===req.assetId?{...a,status:"Under Maintenance"}:a));toast.success(`Approved! ${req.assetName} sent for repair.`,{description:"Asset status updated."});}
    else if (next==="Resolved"){setAssets(assets.map(a=>a.id===req.assetId?{...a,status:"Available"}:a));toast.success(`Resolved! ${req.assetName} is Available again.`,{description:"Asset status updated."});}
    else toast.success(`Status → ${next}`,{description:"Request updated."});
  };

  const reject=(req:MaintReq)=>{
    setMaint(maint.map(m=>m.id===req.id?{...m,status:"Rejected"}:m));
    toast.error("Request rejected.",{description:`${req.assetName} — ${req.requestedBy}`});
  };

  const submit=()=>{
    const a=assets.find(x=>x.id===form.assetId);
    if (!a||!form.issue.trim()){toast.error("Please fill in all fields.");return;}
    const req:MaintReq={id:`m_${Date.now()}`,assetId:a.id,assetName:a.name,assetTag:a.tag,issue:form.issue.trim(),priority:form.priority,status:"Pending",requestedBy:user.name,requestedDate:new Date().toISOString().split("T")[0]};
    setMaint([req,...maint]);
    toast.success("Maintenance request submitted!",{description:`${a.name} — ${form.priority} Priority`});
    setShow(false);
    setForm({assetId:"",issue:"",priority:"Medium"});
  };

  return (
    <div className="p-6 space-y-5 max-w-screen-xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-black text-slate-900">Maintenance</h1><p className="text-sm text-slate-500">Track Under Maintenance status and approvals</p></div>
        <Btn variant="primary" onClick={()=>setShow(true)}><Plus className="w-4 h-4"/>Raise Request</Btn>
      </div>
      <div className="flex gap-2 flex-wrap">
        <button onClick={()=>setFilter("")} className={clsx("px-4 py-2 text-xs font-bold rounded-full border transition-all",!filter?"bg-indigo-600 text-white border-indigo-600":"bg-white text-slate-600 border-slate-200 hover:border-indigo-300")}>All ({maint.length})</button>
        {(["Pending","Approved","Technician Assigned","In Progress","Resolved","Rejected"] as MaintStatus[]).map(s=>(
          <button key={s} onClick={()=>setFilter(f=>f===s?"":s)} className={clsx("px-4 py-2 text-xs font-bold rounded-full border transition-all",filter===s?"bg-indigo-600 text-white border-indigo-600":"bg-white text-slate-600 border-slate-200 hover:border-indigo-300")}>
            {s} ({maint.filter(m=>m.status===s).length})
          </button>
        ))}
      </div>
      <div className="space-y-4">
        {shown.length===0
          ? <Card><div className="p-6"><Empty icon={Wrench} title="No requests" desc="No maintenance requests match this filter."/></div></Card>
          : shown.map(req=>(
            <Card key={req.id} className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
                <div>
                  <div className="flex flex-wrap items-center gap-2 mb-1.5"><span className="text-sm font-bold text-slate-900">{req.assetName}</span><span className="font-mono text-xs font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-lg">{req.assetTag}</span></div>
                  <div className="flex flex-wrap items-center gap-2"><PBadge priority={req.priority}/><MBadge status={req.status}/></div>
                </div>
                <div className="text-right text-xs text-slate-400"><p>By {req.requestedBy.split(" ")[0]}</p><p>{req.requestedDate}</p>{req.approvedBy&&<p>Approved: {req.approvedBy.split(" ")[0]}</p>}</div>
              </div>
              <p className="text-sm text-slate-700 font-medium mb-4 leading-relaxed bg-slate-50 p-3 rounded-xl">{req.issue}</p>
              {req.status!=="Rejected"&&req.status!=="Resolved"&&<div className="mb-4 overflow-x-auto"><Steps steps={MSTEPS} current={MSTEPS.indexOf(req.status)}/></div>}
              {req.notes&&<div className="text-xs text-slate-600 bg-amber-50 border-l-4 border-amber-300 pl-3 py-2 rounded-r-xl mb-3">{req.notes}</div>}
              {req.technician&&<p className="text-xs text-slate-500 mb-3">Technician: <strong>{req.technician}</strong></p>}
              <div className="flex flex-wrap gap-2">
                {canApprove&&req.status==="Pending"&&(<><Btn variant="primary" size="xs" onClick={()=>advance(req)}><Check className="w-3.5 h-3.5"/>Approve</Btn><Btn variant="danger" size="xs" onClick={()=>reject(req)}><X className="w-3.5 h-3.5"/>Reject</Btn></>)}
                {canApprove&&!["Pending","Rejected","Resolved"].includes(req.status)&&NXT_LBL[req.status]&&(<Btn variant="secondary" size="xs" onClick={()=>advance(req)}><ArrowRight className="w-3.5 h-3.5"/>{NXT_LBL[req.status]}</Btn>)}
                {req.status==="Resolved"&&<div className="flex items-center gap-2 text-emerald-600"><CheckCircle className="w-4 h-4"/><span className="text-xs font-bold">Resolved{req.resolvedDate&&` — ${req.resolvedDate}`}</span></div>}
                {req.status==="Rejected"&&<div className="flex items-center gap-2 text-red-500"><XCircle className="w-4 h-4"/><span className="text-xs font-bold">Rejected</span></div>}
              </div>
            </Card>
          ))}
      </div>
      {show&&(
        <Modal title="Raise Maintenance Request" onClose={()=>setShow(false)}>
          <div className="space-y-4">
            <Fld label="Asset *"><Sel value={form.assetId} onChange={v=>setForm(p=>({...p,assetId:v}))} options={[{value:"",label:"Select an asset…"},...assets.map(a=>({value:a.id,label:`${a.name} (${a.tag})`.slice(0,48)}))]} /></Fld>
            <Fld label="Issue Description *"><Txtarea value={form.issue} onChange={v=>setForm(p=>({...p,issue:v}))} placeholder="Describe the issue in detail…" rows={4}/></Fld>
            <Fld label="Priority"><Sel value={form.priority} onChange={v=>setForm(p=>({...p,priority:v as Priority}))} options={["Low","Medium","High","Critical"].map(p=>({value:p,label:p}))}/></Fld>
            <div className="flex justify-end gap-3 pt-2">
              <Btn variant="outline" onClick={()=>setShow(false)}>Cancel</Btn>
              <Btn variant="primary" onClick={submit}><Send className="w-4 h-4"/>Submit</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── AUDIT ────────────────────────────────────────────────────────────────────
function AuditScreen({ user, assets, setAssets }: { user:User; assets:Asset[]; setAssets:(a:Asset[])=>void }) {
  const [audits,setAudits] = useState<AuditCycle[]>(INIT_AUDITS);
  const [sel,setSel]       = useState<AuditCycle>(INIT_AUDITS[0]);
  const [showCreate,setShow] = useState(false);
  const [form,setForm]     = useState({ name:"", scope:DEPT_NAMES[0], start:"", end:"" });

  const updateItem=(cycleId:string,assetId:string,result:AuditItem["result"])=>{
    setAudits(prev=>{
      const updated=prev.map(c=>c.id===cycleId?{...c,items:c.items.map(i=>i.assetId===assetId?{...i,result}:i)}:c);
      setSel(updated.find(c=>c.id===cycleId)||sel);
      return updated;
    });
    const res={Verified:"Marked Verified",Missing:"Marked Missing",Damaged:"Marked Damaged",Pending:"Marked Pending"}[result];
    toast.success(res,{description:"Audit item updated."});
  };

  const closeCycle=(id:string)=>{
    const c=audits.find(x=>x.id===id); if (!c) return;
    const missing=c.items.filter(i=>i.result==="Missing");
    missing.forEach(i=>setAssets(assets.map(a=>a.id===i.assetId?{...a,status:"Lost"}:a)));
    setAudits(prev=>{const u=prev.map(x=>x.id===id?{...x,status:"Closed" as const}:x);setSel(u.find(x=>x.id===id)||sel);return u;});
    toast.success(`Audit cycle closed!`,{description:`${missing.length} asset(s) marked 'Lost'.`});
  };

  const RES_CLR: Record<AuditItem["result"],string>={
    Verified:"bg-emerald-100 text-emerald-700 border-emerald-200",
    Missing: "bg-red-100 text-red-700 border-red-200",
    Damaged: "bg-orange-100 text-orange-700 border-orange-200",
    Pending: "bg-slate-100 text-slate-600 border-slate-200",
  };

  const doCreate=()=>{
    if (!form.name||!form.start||!form.end){toast.error("Please fill in all fields.");return;}
    const nc:AuditCycle={id:`ac_${Date.now()}`,name:form.name,scope:form.scope,startDate:form.start,endDate:form.end,auditor:user.name,status:"Active",items:[]};
    setAudits(p=>[...p,nc]);
    setSel(nc);
    toast.success("New audit cycle created!",{description:form.name});
    setShow(false);
    setForm({name:"",scope:DEPT_NAMES[0],start:"",end:""});
  };

  return (
    <div className="p-6 space-y-5 max-w-screen-xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-black text-slate-900">Asset Audit</h1><p className="text-sm text-slate-500">Manage scoped audit cycles</p></div>
        {user.role==="admin"&&<Btn variant="primary" onClick={()=>setShow(true)}><Plus className="w-4 h-4"/>New Cycle</Btn>}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="space-y-3">
          <p className="text-xs font-bold text-slate-500 uppercase tracking-wide">Audit Cycles</p>
          {audits.map(c=>(
            <button key={c.id} onClick={()=>setSel(c)} className={clsx("w-full p-4 rounded-2xl border text-left transition-all",sel?.id===c.id?"border-indigo-400 bg-indigo-50 shadow-sm":"border-slate-200 bg-white hover:border-indigo-200")}>
              <div className="flex items-center justify-between mb-2">
                <span className={clsx("text-[10px] font-bold px-2.5 py-1 rounded-full border uppercase tracking-wide",c.status==="Active"?"bg-emerald-50 text-emerald-700 border-emerald-200":"bg-slate-100 text-slate-500 border-slate-200")}>{c.status==="Active"?"Active":"Closed"}</span>
                <span className="text-xs text-slate-400">{c.items.length} items</span>
              </div>
              <p className="text-sm font-bold text-slate-900">{c.name}</p>
              <p className="text-xs text-slate-500 mt-0.5">{c.scope}</p>
              <p className="text-xs text-slate-400 mt-0.5">{c.startDate} → {c.endDate}</p>
              <p className="text-xs text-slate-400 mt-1 font-medium">Auditor: {c.auditor.split(" ")[0]}</p>
            </button>
          ))}
        </div>
        {sel&&(
          <Card className="lg:col-span-2 p-6">
            <div className="flex flex-wrap items-start justify-between gap-3 mb-5">
              <div><h3 className="text-base font-black text-slate-900">{sel.name}</h3><p className="text-xs text-slate-500 mt-1">{sel.scope} · {sel.startDate} to {sel.endDate} · Auditor: {sel.auditor.split(" ")[0]}</p></div>
              {sel.status==="Active"&&user.role==="admin"&&(<Btn variant="danger" size="xs" onClick={()=>closeCycle(sel.id)}><Lock className="w-3.5 h-3.5"/>Close Cycle</Btn>)}
            </div>
            <div className="grid grid-cols-4 gap-3 mb-5">
              {[{l:"Verified",n:sel.items.filter(i=>i.result==="Verified").length,c:"text-emerald-700 bg-emerald-50 border-emerald-200"},{l:"Missing",n:sel.items.filter(i=>i.result==="Missing").length,c:"text-red-700 bg-red-50 border-red-200"},{l:"Damaged",n:sel.items.filter(i=>i.result==="Damaged").length,c:"text-orange-700 bg-orange-50 border-orange-200"},{l:"Pending",n:sel.items.filter(i=>i.result==="Pending").length,c:"text-slate-600 bg-slate-100 border-slate-200"}].map(({l,n,c})=>(
                <div key={l} className={clsx("p-3 rounded-xl border text-center",c)}><div className="text-2xl font-black">{n}</div><div className="text-[10px] font-bold uppercase tracking-wide mt-0.5">{l}</div></div>
              ))}
            </div>
            {sel.status==="Active"&&sel.items.some(i=>i.result==="Missing")&&(
              <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl mb-4"><AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5"/><p className="text-xs text-amber-800 font-medium">Closing the cycle will mark all <strong>Missing</strong> assets as <strong>Lost</strong>.</p></div>
            )}
            {sel.items.length===0&&<Empty icon={ClipboardList} title="No items in this cycle" desc="Add assets to get started."/>}
            <div className="space-y-2">
              {sel.items.map(item=>(
                <div key={item.assetId} className="flex flex-wrap items-center gap-3 p-3.5 rounded-xl bg-slate-50 hover:bg-white border border-slate-100 transition-colors">
                  <span className="font-mono text-xs font-bold bg-white px-2.5 py-1 rounded-lg border border-slate-200 shrink-0">{item.assetTag}</span>
                  <span className="text-sm font-semibold text-slate-900 flex-1 min-w-[120px]">{item.assetName}</span>
                  {sel.status==="Active"
                    ? <div className="flex gap-1.5 flex-wrap">{(["Verified","Missing","Damaged"] as const).map(r=>(
                      <button key={r} onClick={()=>updateItem(sel.id,item.assetId,r)} className={clsx("px-3 py-1.5 text-xs font-bold rounded-lg border transition-all",item.result===r?RES_CLR[r]:"bg-white text-slate-500 border-slate-200 hover:border-slate-300")}>
                        {r==="Verified"?"Verified":r==="Missing"?"Missing":"Damaged"}
                      </button>
                    ))}</div>
                    : <span className={clsx("text-xs font-bold px-2.5 py-1 rounded-full border",RES_CLR[item.result])}>{item.result}</span>}
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
      {showCreate&&(
        <Modal title="Create New Audit Cycle" onClose={()=>setShow(false)}>
          <div className="space-y-4">
            <Fld label="Cycle Name *"><Inp value={form.name} onChange={v=>setForm(p=>({...p,name:v}))} placeholder="e.g. Q4 2024 Full Audit"/></Fld>
            <Fld label="Scope"><Sel value={form.scope} onChange={v=>setForm(p=>({...p,scope:v}))} options={["All Departments",...DEPT_NAMES].map(d=>({value:d,label:d}))}/></Fld>
            <div className="grid grid-cols-2 gap-3">
              <Fld label="Start Date"><Inp value={form.start} onChange={v=>setForm(p=>({...p,start:v}))} type="date"/></Fld>
              <Fld label="End Date"><Inp value={form.end} onChange={v=>setForm(p=>({...p,end:v}))} type="date"/></Fld>
            </div>
            <div className="flex justify-end gap-3 pt-2">
              <Btn variant="outline" onClick={()=>setShow(false)}>Cancel</Btn>
              <Btn variant="primary" onClick={doCreate}><ClipboardList className="w-4 h-4"/>Create Cycle</Btn>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ─── REPORTS ──────────────────────────────────────────────────────────────────

function ReportsScreen({ assets, maint, bookings }: { assets:Asset[]; maint:MaintReq[]; bookings:Booking[] }) {
  const deptData = DEPT_NAMES.map(d=>({ d:d.slice(0,6), total:assets.filter(a=>a.department===d).length, alloc:assets.filter(a=>a.department===d&&a.status==="Allocated").length }));
  const maintData = [{m:"Feb",req:3,res:2},{m:"Mar",req:5,res:4},{m:"Apr",req:2,res:2},{m:"May",req:7,res:5},{m:"Jun",req:4,res:4},{m:"Jul",req:6,res:3}];
  const utilData  = [{m:"Feb",r:72},{m:"Mar",r:78},{m:"Apr",r:65},{m:"May",r:82},{m:"Jun",r:76},{m:"Jul",r:84}];
  const catData   = CAT_NAMES.map((c,i)=>({ name:c.split(" ")[0], value:assets.filter(a=>a.category===c).length, fill:["#6366F1","#10B981","#F59E0B","#F97316","#EF4444","#94A3B8"][i] })).filter(c=>c.value>0);
  const totalValue = assets.reduce((s,a)=>s+a.acquisitionCost,0);
  const downloadCSV = () => {

  const csvData = assets.map((asset) => ({
    ID: asset.id,
    Name: asset.name,
    Category: asset.category,
    Department: asset.department,
    Status: asset.status,
    Cost: asset.acquisitionCost,
    AcquisitionDate: asset.acquisitionDate,
    SerialNumber: asset.serialNumber,
    AssignedTo: asset.assignedTo || "-"
  }));

  const csv = Papa.unparse(csvData);

  const blob = new Blob([csv], {
    type: "text/csv;charset=utf-8;"
  });

  const url = URL.createObjectURL(blob);

  const link = document.createElement("a");

  link.href = url;
  link.download = "AssetFlow_Report.csv";

  document.body.appendChild(link);

  link.click();

  document.body.removeChild(link);

  URL.revokeObjectURL(url);

  toast.success("CSV Downloaded Successfully");
};


const downloadPDF = () => {

  const doc = new jsPDF();

  doc.setFontSize(20);
  doc.text("AssetFlow ERP Report", 14, 15);

  doc.setFontSize(11);

  doc.text(
    "Generated : " + new Date().toLocaleString(),
    14,
    24
  );

  autoTable(doc, {

    startY: 32,

    head: [[
      "ID",
      "Name",
      "Category",
      "Department",
      "Status",
      "Cost"
    ]],

    body: assets.map((asset) => [

      asset.id,

      asset.name,

      asset.category,

      asset.department,

      asset.status,

      "₹" + asset.acquisitionCost

    ])

  });

  doc.save("AssetFlow_Report.pdf");

  toast.success("PDF Downloaded Successfully");

};

  return (
    <div className="p-6 space-y-6 max-w-screen-xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-black text-slate-900">Reports & Analytics</h1><p className="text-sm text-slate-500">Organization-wide overview</p></div>
        <div className="flex gap-2">
          <Btn variant="outline" onClick={downloadCSV}><Download className="w-4 h-4"/>CSV</Btn>
          <Btn variant="outline" onClick={downloadPDF}><FileText className="w-4 h-4"/>PDF</Btn>
        </div>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KPI label="Total Assets"  value={assets.length}               sub="registered"         icon={Package}      color="indigo" />
        <KPI label="Total Value"        value={INR_K(totalValue)}           sub="acquisition value"     icon={IndianRupee}  color="emerald" />
        <KPI label="Utilization Rate"        value="84%"                         sub="this month"        icon={TrendingUp}   color="blue" />
        <KPI label="Maintenance (YTD)"  value={maint.length}               sub="total requests"     icon={Wrench}       color="orange" />
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Utilization Rate Trend</h3>
          <ResponsiveContainer width="100%" height={190}>
            <AreaChart data={utilData}>
              <defs><linearGradient id="rep-ag" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#6366F1" stopOpacity={0.2}/><stop offset="100%" stopColor="#6366F1" stopOpacity={0}/></linearGradient></defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="m" tick={{fontSize:11,fill:"#94A3B8",fontWeight:600}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:11,fill:"#94A3B8"}} axisLine={false} tickLine={false} unit="%" domain={[50,100]}/>
              <Tooltip contentStyle={{borderRadius:10,border:"1px solid #E2E8F0",fontSize:12}}/>
              <Area type="monotone" dataKey="r" name="Utilization %" stroke="#6366F1" strokeWidth={2.5} fill="url(#rep-ag)"/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Maintenance Requests</h3>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={maintData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9"/>
              <XAxis dataKey="m" tick={{fontSize:11,fill:"#94A3B8",fontWeight:600}} axisLine={false} tickLine={false}/>
              <YAxis tick={{fontSize:11,fill:"#94A3B8"}} axisLine={false} tickLine={false}/>
              <Tooltip contentStyle={{borderRadius:10,border:"1px solid #E2E8F0",fontSize:12}}/>
              <Bar dataKey="req" fill="#6366F1" radius={[4,4,0,0]} name="Requests"/>
              <Bar dataKey="res" fill="#10B981" radius={[4,4,0,0]} name="Resolved"/>
              <Legend wrapperStyle={{fontSize:11,paddingTop:8}}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Assets by Department</h3>
          <ResponsiveContainer width="100%" height={190}>
            <BarChart data={deptData} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false}/>
              <XAxis type="number" tick={{fontSize:11,fill:"#94A3B8"}} axisLine={false} tickLine={false}/>
              <YAxis type="category" dataKey="d" tick={{fontSize:10,fill:"#94A3B8",fontWeight:600}} axisLine={false} tickLine={false} width={52}/>
              <Tooltip contentStyle={{borderRadius:10,border:"1px solid #E2E8F0",fontSize:12}}/>
              <Bar dataKey="total" fill="#E0E7FF" radius={[0,4,4,0]} name="Total"/>
              <Bar dataKey="alloc" fill="#6366F1" radius={[0,4,4,0]} name="Allocated"/>
              <Legend wrapperStyle={{fontSize:11,paddingTop:8}}/>
            </BarChart>
          </ResponsiveContainer>
        </Card>
        <Card className="p-5">
          <h3 className="text-sm font-bold text-slate-900 mb-4">Assets by Category</h3>
          <div className="flex items-center gap-4">
            <ResponsiveContainer width="55%" height={190}>
              <PieChart><Pie data={catData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}/><Tooltip contentStyle={{borderRadius:10,border:"1px solid #E2E8F0",fontSize:12}}/></PieChart>
            </ResponsiveContainer>
            <div className="space-y-2.5 flex-1">
              {catData.map(c=>(
                <div key={c.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><div className="w-3 h-3 rounded-full shrink-0" style={{background:c.fill}}/><span className="text-xs font-medium text-slate-600">{c.name}</span></div>
                  <span className="text-xs font-black text-slate-800">{c.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
      <Card className="p-5">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Status Breakdown</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead><tr className="border-b border-slate-100">{["Status","Count","% of Total","Value (₹)"].map(h=><th key={h} className="text-left px-3 py-3 text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>)}</tr></thead>
            <tbody>
              {(["Available","Allocated","Reserved","Under Maintenance","Lost","Retired","Disposed"] as AssetStatus[]).map(s=>{
                const count=assets.filter(a=>a.status===s).length;
                const val=assets.filter(a=>a.status===s).reduce((v,a)=>v+a.acquisitionCost,0);
                return (<tr key={s} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-3 py-3"><SBadge status={s}/></td>
                  <td className="px-3 py-3 font-bold text-slate-900">{count}</td>
                  <td className="px-3 py-3 text-slate-600">{assets.length?((count/assets.length)*100).toFixed(1):0}%</td>
                  <td className="px-3 py-3 text-slate-600">{INR(val)}</td>
                </tr>);
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// ─── ORG SETUP ────────────────────────────────────────────────────────────────
function OrgSetupScreen({ assets, users, setUsers }: { assets:Asset[]; users:User[]; setUsers:(u:User[])=>void }) {
  const [tab,setTab]         = useState<"departments"|"categories"|"employees">("departments");
  const [promote,setProm]    = useState<User|null>(null);
  const [newRole,setNR]      = useState<Role>("employee");
  const [departments,setDepts] = useState<Department[]>(INIT_DEPARTMENTS);
  const [categories,setCats]   = useState<Category[]>(INIT_CATEGORIES);
  const [showDept,setSD]     = useState(false);
  const [showCat,setSC]      = useState(false);
  const [editDept,setED]     = useState<Department|null>(null);
  const [editCat,setEC]      = useState<Category|null>(null);
  const [dForm,setDF]        = useState({ name:"", location:"", budget:"" });
  const [cForm,setCF]        = useState({ name:"", depRate:"", description:"" });

  const saveDept=()=>{
    if (!dForm.name.trim()){toast.error("Department name is required.");return;}
    if (editDept) {
      setDepts(prev=>prev.map(d=>d.id===editDept.id?{...d,name:dForm.name,location:dForm.location,budget:parseFloat(dForm.budget)||d.budget}:d));
      toast.success(`Department "${dForm.name}" updated!`);
      setED(null);
    } else {
      const nd:Department={id:`d_${Date.now()}`,name:dForm.name,location:dForm.location||"Unspecified",budget:parseFloat(dForm.budget)||0,active:true};
      setDepts(p=>[...p,nd]);
      toast.success(`New department "${dForm.name}" created!`);
      setSD(false);
    }
    setDF({name:"",location:"",budget:""});
  };

  const saveCat=()=>{
    if (!cForm.name.trim()){toast.error("Category name is required.");return;}
    if (editCat) {
      setCats(prev=>prev.map(c=>c.id===editCat.id?{...c,name:cForm.name,depreciationRate:parseFloat(cForm.depRate)||c.depreciationRate,description:cForm.description}:c));
      toast.success(`Category "${cForm.name}" updated!`);
      setEC(null);
    } else {
      const nc:Category={id:`c_${Date.now()}`,name:cForm.name,depreciationRate:parseFloat(cForm.depRate)||10,description:cForm.description};
      setCats(p=>[...p,nc]);
      toast.success(`New category "${cForm.name}" created!`);
      setSC(false);
    }
    setCF({name:"",depRate:"",description:""});
  };

  return (
    <div className="p-6 space-y-5 max-w-screen-xl mx-auto">
      <div><h1 className="text-2xl font-black text-slate-900">Organization Setup</h1><p className="text-sm text-slate-500">Manage departments, categories, and roles</p></div>
      <div className="flex gap-0 border-b-2 border-slate-100">
        {([["departments","Departments"],["categories","Asset Categories"],["employees","Employee Directory"]] as const).map(([t,l])=>(
          <button key={t} onClick={()=>setTab(t)} className={clsx("px-5 py-2.5 text-sm font-bold transition-all border-b-2 -mb-[2px]",tab===t?"border-indigo-600 text-indigo-700":"border-transparent text-slate-500 hover:text-slate-700")}>{l}</button>
        ))}
      </div>

      {tab==="departments"&&(
        <div className="space-y-3">
          <div className="flex justify-end"><Btn variant="primary" onClick={()=>{setDF({name:"",location:"",budget:""});setSD(true);}}><Plus className="w-4 h-4"/>Add Department</Btn></div>
          {departments.map(d=>{
            const head=users.find(u=>u.id===d.headId);
            const count=assets.filter(a=>a.department===d.name).length;
            return (
              <Card key={d.id} className="p-5 flex flex-wrap items-center gap-4">
                <div className="w-11 h-11 rounded-2xl bg-indigo-50 flex items-center justify-center shrink-0"><Building2 className="w-5 h-5 text-indigo-600"/></div>
                <div className="flex-1 min-w-[150px]">
                  <p className="text-sm font-bold text-slate-900">{d.name}</p>
                  <p className="text-xs text-slate-500 mt-0.5 flex items-center gap-1"><MapPin className="w-3 h-3"/>{d.location}</p>
                  <p className="text-xs text-slate-400 mt-0.5">Head: {head?.name.split(" ")[0]||"Not assigned"} · {count} assets · Budget: {INR_K(d.budget)}</p>
                </div>
                <span className={clsx("text-xs font-bold px-3 py-1 rounded-full border",d.active?"bg-emerald-50 text-emerald-700 border-emerald-200":"bg-slate-100 text-slate-500 border-slate-200")}>{d.active?"Active":"Inactive"}</span>
                <Btn variant="ghost" size="xs" onClick={()=>{setDF({name:d.name,location:d.location,budget:String(d.budget)});setED(d);}}><Edit className="w-3.5 h-3.5"/>Edit</Btn>
              </Card>
            );
          })}
          {(showDept||editDept)&&(
            <Modal title={editDept?"Edit Department":"Add New Department"} onClose={()=>{setSD(false);setED(null);setDF({name:"",location:"",budget:""});}}>
              <div className="space-y-4">
                <Fld label="Department Name *"><Inp value={dForm.name} onChange={v=>setDF(p=>({...p,name:v}))} placeholder="e.g. Legal Department"/></Fld>
                <Fld label="Location"><Inp value={dForm.location} onChange={v=>setDF(p=>({...p,location:v}))} placeholder="e.g. Mumbai, Maharashtra"/></Fld>
                <Fld label="Annual Budget (₹)"><Inp value={dForm.budget} onChange={v=>setDF(p=>({...p,budget:v}))} placeholder="e.g. 5000000" type="number"/></Fld>
                <div className="flex justify-end gap-3 pt-2">
                  <Btn variant="outline" onClick={()=>{setSD(false);setED(null);setDF({name:"",location:"",budget:""});}}>Cancel</Btn>
                  <Btn variant="primary" onClick={saveDept}><Check className="w-4 h-4"/>Save</Btn>
                </div>
              </div>
            </Modal>
          )}
        </div>
      )}

      {tab==="categories"&&(
        <div className="space-y-3">
          <div className="flex justify-end"><Btn variant="primary" onClick={()=>{setCF({name:"",depRate:"",description:""});setSC(true);}}><Plus className="w-4 h-4"/>Add Category</Btn></div>
          {categories.map(c=>(
            <Card key={c.id} className="p-5 flex flex-wrap items-center gap-4">
              <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center shrink-0"><Tag className="w-5 h-5 text-slate-500"/></div>
              <div className="flex-1">
                <p className="text-sm font-bold text-slate-900">{c.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{c.description}</p>
                <p className="text-xs text-slate-400 mt-0.5">{assets.filter(a=>a.category===c.name).length} assets · Depreciation: {c.depreciationRate}% p.a.</p>
              </div>
              <Btn variant="ghost" size="xs" onClick={()=>{setCF({name:c.name,depRate:String(c.depreciationRate),description:c.description});setEC(c);}}><Edit className="w-3.5 h-3.5"/>Edit</Btn>
            </Card>
          ))}
          {(showCat||editCat)&&(
            <Modal title={editCat?"Edit Category":"Add New Category"} onClose={()=>{setSC(false);setEC(null);setCF({name:"",depRate:"",description:""});}}>
              <div className="space-y-4">
                <Fld label="Category Name *"><Inp value={cForm.name} onChange={v=>setCF(p=>({...p,name:v}))} placeholder="e.g. Medical Equipment"/></Fld>
                <Fld label="Depreciation Rate (% p.a.)"><Inp value={cForm.depRate} onChange={v=>setCF(p=>({...p,depRate:v}))} placeholder="e.g. 15" type="number"/></Fld>
                <Fld label="Description"><Txtarea value={cForm.description} onChange={v=>setCF(p=>({...p,description:v}))} placeholder="Describe this category…" rows={2}/></Fld>
                <div className="flex justify-end gap-3 pt-2">
                  <Btn variant="outline" onClick={()=>{setSC(false);setEC(null);setCF({name:"",depRate:"",description:""});}}>Cancel</Btn>
                  <Btn variant="primary" onClick={saveCat}><Check className="w-4 h-4"/>Save</Btn>
                </div>
              </div>
            </Modal>
          )}
        </div>
      )}

      {tab==="employees"&&(
        <div className="space-y-4">
          <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-2xl">
            <Shield className="w-5 h-5 text-amber-600 shrink-0 mt-0.5"/>
            <div><p className="text-sm font-bold text-amber-900">Role Changes — Admin Only</p><p className="text-xs text-amber-700 mt-0.5">New accounts always start as Employee. Only Admin can change roles.</p></div>
          </div>
          <Card>
            <div className="overflow-x-auto rounded-2xl">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-slate-100 bg-slate-50/50">{["Employee","Email","Department","City","Role","Action"].map(h=><th key={h} className="text-left px-4 py-3.5 text-xs font-bold text-slate-500 uppercase tracking-wide">{h}</th>)}</tr></thead>
                <tbody>
                  {users.map(u=>(
                    <tr key={u.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3.5"><div className="flex items-center gap-3"><Av initials={u.avatar} size="sm"/><span className="text-sm font-bold text-slate-900">{u.name.split(" ").slice(0,2).join(" ")}</span></div></td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">{u.email}</td>
                      <td className="px-4 py-3.5 text-sm text-slate-600">{u.department}</td>
                      <td className="px-4 py-3.5 text-xs text-slate-500">{u.city||"—"}</td>
                      <td className="px-4 py-3.5"><RBadge role={u.role}/></td>
                      <td className="px-4 py-3.5"><Btn variant="secondary" size="xs" onClick={()=>{setProm(u);setNR(u.role);}}><Shield className="w-3.5 h-3.5"/>Change Role</Btn></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
          {promote&&(
            <Modal title={`Change Role — ${promote.name.split(" ")[0]}`} onClose={()=>setProm(null)}>
              <div className="space-y-4">
                <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <Av initials={promote.avatar} size="md"/>
                  <div className="flex-1"><p className="text-sm font-bold text-slate-900">{promote.name}</p><p className="text-xs text-slate-500">{promote.email} · {promote.department}</p></div>
                  <RBadge role={promote.role}/>
                </div>
                <Fld label="New Role">
                  <Sel value={newRole} onChange={v=>setNR(v as Role)} options={[{value:"employee",label:"Employee"},{value:"dept_head",label:"Dept Head"},{value:"manager",label:"Asset Manager"},{value:"admin",label:"Admin"}]}/>
                </Fld>
                <div className="flex justify-end gap-3 pt-2">
                  <Btn variant="outline" onClick={()=>setProm(null)}>Cancel</Btn>
                  <Btn variant="primary" onClick={()=>{setUsers(users.map(u=>u.id===promote.id?{...u,role:newRole}:u));toast.success(`${promote.name.split(" ")[0]} is now ${ROLE_LABEL_EN[newRole]}!`,{description:"Notification sent."});setProm(null);}}><Check className="w-4 h-4"/>Save Change</Btn>
                </div>
              </div>
            </Modal>
          )}
        </div>
      )}
    </div>
  );
}

// ─── NOTIFICATIONS ────────────────────────────────────────────────────────────
function NotificationsScreen({ notifs, setNotifs }: { notifs:Notif[]; setNotifs:(n:Notif[])=>void }) {
  const markAll=()=>{setNotifs(notifs.map(n=>({...n,read:true})));toast.success("All notifications marked as read!", {description:`${notifs.filter(n=>!n.read).length} notification(s) marked.`});};
  const del=(id:string)=>setNotifs(notifs.filter(n=>n.id!==id));
  const TYPE_ICON=(t:Notif["type"])=>({info:<Info className="w-4 h-4 text-blue-500"/>,success:<CheckCircle className="w-4 h-4 text-emerald-500"/>,warning:<AlertTriangle className="w-4 h-4 text-amber-500"/>,error:<XCircle className="w-4 h-4 text-red-500"/>}[t]);
  const TYPE_BG=(t:Notif["type"])=>({info:"bg-blue-50 border-blue-200",success:"bg-emerald-50 border-emerald-200",warning:"bg-amber-50 border-amber-200",error:"bg-red-50 border-red-200"}[t]);
  const TYPE_IB=(t:Notif["type"])=>({info:"bg-blue-100",success:"bg-emerald-100",warning:"bg-amber-100",error:"bg-red-100"}[t]);
  const unread=notifs.filter(n=>!n.read).length;

  return (
    <div className="p-6 space-y-5 max-w-screen-xl mx-auto">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><h1 className="text-2xl font-black text-slate-900">Notifications</h1><p className="text-sm text-slate-500">{unread} unread notification(s)</p></div>
        <div className="flex gap-2">
          <Btn variant="outline" onClick={markAll}><Check className="w-4 h-4"/>Mark All Read</Btn>
          <Btn variant="ghost" onClick={()=>{const before=notifs.length; setNotifs(notifs.filter(n=>!n.read)); toast.success(`Cleared ${before-notifs.filter(n=>!n.read).length} read notification(s).`)}}><Archive className="w-4 h-4"/>Clear Read</Btn>
        </div>
      </div>
      <div className="space-y-2">
        {notifs.length===0&&<Card><div className="p-6"><Empty icon={Bell} title="All caught up!" desc="No notifications right now."/></div></Card>}
        {notifs.map(n=>(
          <div key={n.id} className={clsx("flex items-start gap-4 p-4 rounded-2xl border transition-all cursor-pointer group",!n.read?TYPE_BG(n.type):"bg-white border-slate-100 opacity-60 hover:opacity-100")}
            onClick={()=>setNotifs(notifs.map(x=>x.id===n.id?{...x,read:true}:x))}>
            <div className={clsx("w-9 h-9 rounded-xl flex items-center justify-center shrink-0",TYPE_IB(n.type))}>{TYPE_ICON(n.type)}</div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2 mb-0.5">
                <p className="text-sm font-bold text-slate-900">{n.title}</p>
                <span className="text-xs text-slate-400 shrink-0">{n.timestamp}</span>
              </div>
              <p className="text-xs text-slate-600 font-medium leading-relaxed">{n.message}</p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {!n.read&&<div className="w-2.5 h-2.5 rounded-full bg-indigo-600"/>}
              <button onClick={e=>{e.stopPropagation();del(n.id);}} className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-white/60 transition-all text-slate-400 hover:text-red-500"><X className="w-3.5 h-3.5"/></button>
            </div>
          </div>
        ))}
      </div>
      <Card className="p-6">
        <h3 className="text-sm font-bold text-slate-900 mb-4">Activity Log</h3>
        <div className="space-y-0">
          {ACTIVITY_LOG.map((log,i)=>(
            <div key={log.id} className={clsx("flex items-start gap-3 py-3.5",i<ACTIVITY_LOG.length-1&&"border-b border-slate-50")}>
              <Av initials={log.user.split(" ").map(w=>w[0]).join("")} size="sm"/>
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-800 leading-relaxed"><span className="font-bold">{log.user.split(" ")[0]}</span>{" "}<span className="text-indigo-600 font-semibold">{log.action}</span>{" "}<span className="font-bold">{log.target}</span></p>
                <p className="text-[10px] text-slate-400 mt-0.5">{log.detail} · {log.time}</p>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ─── SIDEBAR ──────────────────────────────────────────────────────────────────
function AppShell({ user, logout, screen, nav, unread, children, users }: {
  user:User; logout:()=>void; screen:Screen; nav:(s:Screen)=>void; unread:number; children:React.ReactNode; users:User[];
}) {
  const [open,setOpen] = useState(false);
  const navItems = getNav(user.role);

  const SidebarContent=()=>(
    <div className="flex flex-col h-full overflow-y-auto">
      <div className="flex items-center gap-3 px-5 py-5 shrink-0">
        <Logo size={38}/>
        <div><span className="text-base font-black text-white tracking-tight leading-none">AssetFlow</span><p className="text-[10px] text-indigo-400 leading-tight mt-0.5">Bharat Corp ERP</p></div>
      </div>
      <div className="px-4 mb-3 shrink-0">
        <div className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-white/5 border border-white/10">
          <Av initials={user.avatar} size="xs"/>
          <div className="min-w-0 flex-1">
            <p className="text-[10px] text-indigo-400 font-bold uppercase tracking-widest">Logged in as</p>
            <p className="text-xs text-white font-bold truncate">{ROLE_LABEL_EN[user.role]}</p>
          </div>
        </div>
      </div>
      <nav className="flex-1 px-3 py-1 space-y-0.5">
        {navItems.map(item=>{
          const active=screen===item.id;
          return (
            <button key={item.id} onClick={()=>{nav(item.id);setOpen(false);}}
              className={clsx("w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all group",active?"bg-indigo-600 text-white shadow-md shadow-indigo-900/50":"text-indigo-300 hover:bg-white/10 hover:text-white")}>
              <item.icon className={clsx("w-4 h-4 shrink-0",active?"text-white":"text-indigo-400 group-hover:text-indigo-200")}/>
              <span className="flex-1 text-left">{item.label}</span>
              {item.id==="notifications"&&unread>0&&<span className="w-5 h-5 rounded-full bg-red-500 text-white text-[10px] flex items-center justify-center font-black">{unread}</span>}
            </button>
          );
        })}
      </nav>
      <div className="px-4 py-4 border-t border-white/10 shrink-0">
        <button onClick={logout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold text-indigo-300 hover:bg-red-500/20 hover:text-red-300 transition-all">
          <LogOut className="w-4 h-4 shrink-0"/><span>Sign Out</span>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-100">
      <div className="hidden lg:flex flex-col w-56 shrink-0" style={{background:"#1e1b4b"}}><SidebarContent/></div>
      {open&&(
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={()=>setOpen(false)}/>
          <div className="relative w-64 h-full flex flex-col shadow-2xl" style={{background:"#1e1b4b"}}><SidebarContent/></div>
        </div>
      )}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-3.5 bg-white border-b border-slate-200 shadow-sm shrink-0">
          <button onClick={()=>setOpen(true)} className="lg:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors"><Menu className="w-4 h-4 text-slate-600"/></button>
          <div className="flex-1 min-w-0">
            <h2 className="text-sm font-black text-slate-900 truncate">{navItems.find(n=>n.id===screen)?.label||"Dashboard"}</h2>
          </div>
          <button onClick={()=>nav("notifications")} className="relative p-2 rounded-xl hover:bg-slate-100 transition-colors">
            <Bell className="w-4 h-4 text-slate-600"/>
            {unread>0&&<span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-red-500 border-2 border-white animate-pulse"/>}
          </button>
          <ProfileDropdown user={user} logout={logout} nav={nav}/>
        </div>
        <div className="flex-1 overflow-y-auto">{children}</div>
      </div>
    </div>
  );
}

// ─── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [view,setView]     = useState<"login"|"signup">("login");
  const [me,setMe]         = useState<User|null>(null);
  const [screen,setScreen] = useState<Screen>("dashboard");
  const [detailId,setDId]  = useState<string|null>(null);

  const [assets,   setAssets]   = useState<Asset[]>(INIT_ASSETS);
  const [maint,    setMaint]    = useState<MaintReq[]>(INIT_MAINT);
  const [bookings, setBookings] = useState<Booking[]>(INIT_BOOKINGS);
  const [notifs,   setNotifs]   = useState<Notif[]>(INIT_NOTIFS);
  const [users,    setUsers]    = useState<User[]>(DEMO_USERS);

  const unread = notifs.filter(n=>!n.read).length;
  const nav    = (s: Screen) => setScreen(s);
  const logout = () => { setMe(null); setView("login"); setScreen("dashboard"); };

  if (!me) return (
    <>
      {view==="login"
        ? <LoginScreen onLogin={u=>setMe(u)} onSignup={()=>setView("signup")}/>
        : <SignupScreen onBack={()=>setView("login")} onCreate={u=>{setUsers(p=>[...p,u]);setMe(u);}}/>}
      <Toaster position="bottom-right" richColors expand toastOptions={{duration:4000,style:{fontFamily:"Inter, system-ui, sans-serif"}}}/>
    </>
  );

  const detailAsset = assets.find(a=>a.id===detailId);
  const content = (()=>{
    switch (screen) {
      case "dashboard":    return <DashboardScreen user={me} assets={assets} maint={maint} bookings={bookings} nav={nav}/>;
      case "assets":       return <AssetRegistryScreen user={me} assets={assets} setAssets={setAssets} nav={nav} setDetailId={setDId}/>;
      case "asset-detail": return detailAsset?<AssetDetailScreen asset={detailAsset} user={me} maint={maint} nav={nav} assets={assets} setAssets={setAssets}/>:<AssetRegistryScreen user={me} assets={assets} setAssets={setAssets} nav={nav} setDetailId={setDId}/>;
      case "allocation":   return <AllocationScreen user={me} assets={assets} setAssets={setAssets}/>;
      case "booking":      return <BookingScreen user={me} assets={assets} bookings={bookings} setBookings={setBookings}/>;
      case "maintenance":  return <MaintenanceScreen user={me} assets={assets} maint={maint} setMaint={setMaint} setAssets={setAssets}/>;
      case "audit":        return <AuditScreen user={me} assets={assets} setAssets={setAssets}/>;
      case "reports":      return <ReportsScreen assets={assets} maint={maint} bookings={bookings}/>;
      case "org-setup":    return me.role==="admin"?<OrgSetupScreen assets={assets} users={users} setUsers={setUsers}/>:<DashboardScreen user={me} assets={assets} maint={maint} bookings={bookings} nav={nav}/>;
      case "notifications":return <NotificationsScreen notifs={notifs} setNotifs={setNotifs}/>;
      default:             return <DashboardScreen user={me} assets={assets} maint={maint} bookings={bookings} nav={nav}/>;
    }
  })();

  return (
    <>
      <AppShell user={me} logout={logout} screen={screen} nav={nav} unread={unread} users={users}>{content}</AppShell>
      <Toaster position="bottom-right" richColors expand toastOptions={{duration:4000,style:{fontFamily:"Inter, system-ui, sans-serif"}}}/>
    </>
  );
}