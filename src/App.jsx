import React, { useState, useEffect, useMemo } from 'react';
import { initializeApp } from 'firebase/app';
import { 
  getFirestore, collection, addDoc, query, where, onSnapshot, 
  updateDoc, doc, setDoc, serverTimestamp, orderBy, deleteDoc 
} from 'firebase/firestore';
import { 
  getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken 
} from 'firebase/auth';
import { 
  Calendar as CalendarIcon, ShieldAlert, CheckCircle, XCircle, Users, 
  LayoutDashboard, Bell, ChevronRight, AlertTriangle,
  LogOut, UserCog, ChevronLeft, User, ArrowRight, CalendarDays, UserPlus, Briefcase,
  Settings, Activity, Building, Lock, Plus, Edit3, Save, Trash2, Layers, Search, History,
  Stethoscope, Palmtree, Filter, CalendarPlus, KeyRound, Archive, PlayCircle
} from 'lucide-react';

// --- Firebase Configuration & Init ---
// IMPORTANT: Replace these values with YOUR actual Firebase keys!
const firebaseConfig = {
  apiKey: "AIzaSy...", // <-- PASTE YOUR REAL API KEY HERE
  authDomain: "leaveos-yourname.firebaseapp.com",
  projectId: "leaveos-yourname",
  storageBucket: "leaveos-yourname.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123def456",
  measurementId: "G-XYZ123"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'default-app-id'; // Static ID for this deployment

// --- Constants ---
const UK_HOLIDAYS_2025 = [
  '2025-01-01', '2025-04-18', '2025-04-21', '2025-05-05', 
  '2025-05-26', '2025-08-25', '2025-12-25', '2025-12-26'
];

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

// --- Minimal Bootstrap Data ---
const BOOTSTRAP_ADMIN = { 
  id: 'admin_bootstrap', 
  name: 'Eva Admin', 
  role: 'ADMIN', 
  department_id: 'dept_admin_00', 
  avatar: 'EA', 
  color: 'bg-rose-600', 
  job_title: 'System Administrator', 
  custom_allowance: null,
  carry_over_days: 0,
  passcode: '0000' 
};

// --- Helper Functions ---
const calculateBusinessDays = (start, end) => {
  let count = 0;
  let cur = new Date(start);
  const stop = new Date(end);

  while (cur <= stop) {
    const dayOfWeek = cur.getDay();
    const isWeekend = (dayOfWeek === 6) || (dayOfWeek === 0);
    const year = cur.getFullYear();
    const month = String(cur.getMonth() + 1).padStart(2, '0');
    const day = String(cur.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;
    const isHoliday = UK_HOLIDAYS_2025.includes(dateString);

    if (!isWeekend && !isHoliday) count++;
    cur.setDate(cur.getDate() + 1);
  }
  return count;
};

const formatDate = (dateStr) => {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const isUserOff = (userId, dateObj, requests) => {
  return requests.find(r => {
    if (r.user_id !== userId || r.status !== 'APPROVED') return false;
    const start = new Date(r.start_date);
    const end = new Date(r.end_date);
    const check = new Date(dateObj);
    check.setHours(0,0,0,0);
    start.setHours(0,0,0,0);
    end.setHours(0,0,0,0);
    return check >= start && check <= end;
  });
};

const isWeekend = (dateObj) => {
  const day = dateObj.getDay();
  return day === 0 || day === 6; 
};

const isSameDay = (d1, d2) => {
  return d1.getDate() === d2.getDate() && 
         d1.getMonth() === d2.getMonth() && 
         d1.getFullYear() === d2.getFullYear();
};

const getInitials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

const getRandomColor = () => {
  const colors = ['bg-blue-500', 'bg-emerald-500', 'bg-purple-500', 'bg-indigo-500', 'bg-pink-500', 'bg-orange-500', 'bg-cyan-500'];
  return colors[Math.floor(Math.random() * colors.length)];
};

// --- Login Screen (With Passcode) ---
const LoginScreen = ({ onLogin, users }) => {
  const [selectedUser, setSelectedUser] = useState(null);
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState('');

  const handlePasscodeSubmit = (e) => {
    e.preventDefault();
    if (passcode === selectedUser.passcode) {
      onLogin(selectedUser);
    } else {
      setError('Incorrect passcode');
      setPasscode('');
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="p-8 border-b border-slate-100 text-center bg-white">
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-4 shadow-lg shadow-indigo-200">L</div>
          <h1 className="text-2xl font-bold text-slate-900">Welcome to LeaveOS</h1>
          <p className="text-slate-500 text-sm mt-2">Select your profile to login.</p>
        </div>
        
        <div className="p-6 bg-slate-50/50">
          {!selectedUser ? (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {users.length === 0 && <div className="text-center text-slate-400 text-sm py-4">Loading users...</div>}
              {users.map(u => (
                <button 
                  key={u.id}
                  onClick={() => { setSelectedUser(u); setError(''); }}
                  className="w-full flex items-center justify-between p-4 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl transition-all group shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full ${u.color || 'bg-slate-400'} text-white flex items-center justify-center font-bold text-sm`}>
                      {u.avatar}
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-slate-900 group-hover:text-indigo-700">{u.name}</div>
                      <div className="text-xs text-slate-500">
                        {u.job_title || (u.role === 'ADMIN' ? 'System Administrator' : u.role === 'MANAGER' ? 'Manager' : 'Team Member')}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                </button>
              ))}
            </div>
          ) : (
            <div className="animate-in fade-in zoom-in-95 duration-200">
               <button onClick={() => setSelectedUser(null)} className="mb-4 text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1">
                 <ChevronLeft className="w-3 h-3" /> Back to users
               </button>
               <div className="text-center mb-6">
                  <div className={`w-16 h-16 rounded-full ${selectedUser.color} text-white flex items-center justify-center font-bold text-xl mx-auto mb-3 shadow-md`}>
                    {selectedUser.avatar}
                  </div>
                  <h3 className="font-bold text-slate-900">Hello, {selectedUser.name.split(' ')[0]}</h3>
                  <p className="text-xs text-slate-500">Enter your passcode to continue</p>
               </div>
               <form onSubmit={handlePasscodeSubmit} className="space-y-4">
                  <input 
                    type="password" 
                    autoFocus
                    maxLength={4}
                    className="w-full text-center text-2xl tracking-widest font-bold py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                    placeholder="••••"
                    value={passcode}
                    onChange={e => setPasscode(e.target.value)}
                  />
                  {error && <div className="text-xs text-red-500 text-center font-medium">{error}</div>}
                  <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-bold text-sm shadow-lg">Access Dashboard</button>
               </form>
            </div>
          )}
        </div>
        <div className="p-4 bg-slate-100 text-center">
            <p className="text-xs text-slate-400">Default Passcode for Demo: <strong>0000</strong></p>
        </div>
      </div>
    </div>
  );
};

// --- Main Application ---

export default function App() {
  const [user, setUser] = useState(null);
  const [activeUser, setActiveUser] = useState(null); 
  const [activeRole, setActiveRole] = useState('MEMBER'); 
  
  const [requests, setRequests] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [logs, setLogs] = useState([]); // Audit Logs
  
  // UI States
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false); 
  const [isAddDeptOpen, setIsAddDeptOpen] = useState(false); 
  const [isRecordAbsenceOpen, setIsRecordAbsenceOpen] = useState(false);
  const [isRolloverConfirmOpen, setIsRolloverConfirmOpen] = useState(false); // Rollover Confirm
  const [deleteTarget, setDeleteTarget] = useState(null); 
  const [calendarStartDate, setCalendarStartDate] = useState(new Date());
  const [editingStaffId, setEditingStaffId] = useState(null); 
  
  const [calendarDeptFilter, setCalendarDeptFilter] = useState('ALL');
  
  // Form States
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [leaveType, setLeaveType] = useState('HOLIDAY'); 
  const [targetUserId, setTargetUserId] = useState(''); 

  // Staff Form State
  const [staffForm, setStaffForm] = useState({
    name: '',
    job_title: '',
    role: 'MEMBER',
    department_id: '',
    passcode: '0000' 
  });

  // New Dept Form State
  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptAllowance, setNewDeptAllowance] = useState(25);
  
  const [calculatedDays, setCalculatedDays] = useState(0);

  // 1. Firebase Auth Init
  useEffect(() => {
    const initAuth = async () => {
      await signInAnonymously(auth);
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  // 2. Data Fetching
  useEffect(() => {
    if (!user) return;

    const qUsers = query(collection(db, 'artifacts', appId, 'public', 'data', 'users'));
    const unsubUsers = onSnapshot(qUsers, async (snapshot) => {
      if (snapshot.empty) {
        await setDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', BOOTSTRAP_ADMIN.id), BOOTSTRAP_ADMIN);
      } else {
        const usrs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        setAllUsers(usrs.sort((a, b) => {
           const roleScore = { 'ADMIN': 3, 'MANAGER': 2, 'MEMBER': 1 };
           return roleScore[b.role] - roleScore[a.role];
        }));
      }
    });

    const qPol = query(collection(db, 'artifacts', appId, 'public', 'data', 'policies'));
    const unsubPol = onSnapshot(qPol, (snapshot) => {
      const pols = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setPolicies(pols);
    });

    const qReqs = query(collection(db, 'artifacts', appId, 'public', 'data', 'leave_requests'));
    const unsubReqs = onSnapshot(qReqs, (snapshot) => {
      const reqs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      reqs.sort((a, b) => b.created_at?.seconds - a.created_at?.seconds);
      setRequests(reqs);
    }, (err) => console.error("Firestore error:", err));

    // Audit Logs Fetching
    const qLogs = query(collection(db, 'artifacts', appId, 'public', 'data', 'logs'));
    const unsubLogs = onSnapshot(qLogs, (snapshot) => {
        const l = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
        l.sort((a, b) => b.timestamp?.seconds - a.timestamp?.seconds);
        setLogs(l);
    });

    return () => {
        unsubUsers();
        unsubReqs();
        unsubPol();
        unsubLogs();
    };
  }, [user]);

  // 3. Booking Logic
  useEffect(() => {
    if (!startDate || !endDate) {
      setCalculatedDays(0);
      return;
    }
    const days = calculateBusinessDays(startDate, endDate);
    setCalculatedDays(days);
  }, [startDate, endDate]);

  // --- AUDIT LOGGER ---
  const logAction = async (action, details) => {
      try {
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'logs'), {
              action,
              details,
              actor_id: activeUser.id,
              actor_name: activeUser.name,
              timestamp: serverTimestamp()
          });
      } catch (err) {
          console.error("Logging failed:", err);
      }
  };

  // --- YEAR-END ROLLOVER LOGIC ---
  const handleYearEndRollover = async () => {
    setIsRolloverConfirmOpen(false);
    
    // 1. Loop through all users
    for (const u of allUsers) {
        if (u.role === 'ADMIN') continue; // Skip Admins usually

        // 2. Calc current balance
        const userPolicy = policies.find(p => p.department_id === u.department_id) || { allowance: 25, carry_over: 5 };
        const baseAllowance = u.custom_allowance !== undefined && u.custom_allowance !== null ? u.custom_allowance : userPolicy.allowance;
        const currentCarryOver = u.carry_over_days || 0;
        const totalAllowance = baseAllowance + currentCarryOver;
        
        // Calc Used
        const userRequests = requests.filter(r => r.user_id === u.id && r.status === 'APPROVED' && r.leave_type !== 'SICKNESS');
        const used = userRequests.reduce((acc, r) => acc + (r.days_count || 0), 0);
        
        const remaining = Math.max(0, totalAllowance - used);
        
        // 3. Calc New Carry Over
        // Rule: Carry over is limited by policy, and can't exceed actual remaining
        const newCarryOver = Math.min(remaining, userPolicy.carry_over || 5);

        // 4. Update User
        try {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', u.id), {
                carry_over_days: newCarryOver
            });
        } catch (err) {
            console.error(`Failed rollover for ${u.name}`, err);
        }
    }

    logAction('YEAR_END_ROLLOVER', `Processed rollover for ${allUsers.length} users.`);
    alert("Year-end rollover complete. Carry-over balances updated.");
  };

  // --- Actions ---

  const handleLogin = (selectedUser) => {
    setActiveUser(selectedUser);
    setActiveRole(selectedUser.role);
  };

  const handleLogout = () => {
    setActiveUser(null);
    setActiveRole('MEMBER');
    setIsBookingOpen(false);
    setIsCalendarOpen(false);
    setIsStaffModalOpen(false);
    setIsRecordAbsenceOpen(false);
    setEditingStaffId(null);
  };

  const handleBookLeave = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate) return;
    const daysCount = calculateBusinessDays(startDate, endDate);
    try {
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'leave_requests'), {
        user_id: activeUser.id,
        user_name: activeUser.name,
        user_avatar: activeUser.avatar,
        department_id: activeUser.department_id || 'dept_admin_00',
        manager_id: 'mgr_1', 
        start_date: startDate,
        end_date: endDate,
        reason: reason,
        leave_type: leaveType, 
        days_count: daysCount,
        status: 'PENDING',
        created_at: serverTimestamp()
      });
      logAction('REQUEST_LEAVE', `${activeUser.name} requested ${daysCount} days (${leaveType})`);
      setIsBookingOpen(false);
      setStartDate('');
      setEndDate('');
      setReason('');
      setLeaveType('HOLIDAY');
    } catch (err) { console.error("Booking failed:", err); }
  };

  const handleRecordAbsence = async (e) => {
      e.preventDefault();
      if (!startDate || !endDate || !targetUserId) return;
      const targetUser = allUsers.find(u => u.id === targetUserId);
      const daysCount = calculateBusinessDays(startDate, endDate);
      try {
          await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'leave_requests'), {
            user_id: targetUser.id,
            user_name: targetUser.name,
            user_avatar: targetUser.avatar,
            department_id: targetUser.department_id,
            manager_id: activeUser.id, 
            start_date: startDate,
            end_date: endDate,
            reason: reason || 'Recorded by Manager',
            leave_type: leaveType, 
            days_count: daysCount,
            status: 'APPROVED', 
            created_at: serverTimestamp()
          });
          logAction('RECORD_ABSENCE', `Recorded ${daysCount} days absence for ${targetUser.name}`);
          setIsRecordAbsenceOpen(false);
          setStartDate('');
          setEndDate('');
          setReason('');
          setTargetUserId('');
      } catch (err) { console.error("Record failed:", err); }
  };

  // ... Modal Openers ...
  const openRecordAbsenceModal = (preselectedUserId = '') => { setTargetUserId(preselectedUserId); setStartDate(''); setEndDate(''); setReason(''); setLeaveType('SICKNESS'); setIsRecordAbsenceOpen(true); };
  const openAddStaffModal = () => { setEditingStaffId(null); setStaffForm({ name: '', job_title: '', role: 'MEMBER', department_id: activeRole === 'MANAGER' ? activeUser.department_id : (policies[0]?.department_id || ''), passcode: '0000' }); setIsStaffModalOpen(true); };
  const openEditStaffModal = (staff) => { setEditingStaffId(staff.id); setStaffForm({ name: staff.name, job_title: staff.job_title || '', role: staff.role, department_id: staff.department_id, passcode: staff.passcode || '0000' }); setIsStaffModalOpen(true); };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    if (!staffForm.name) return;
    try {
        const payload = {
            name: staffForm.name,
            role: staffForm.role,
            department_id: staffForm.department_id,
            job_title: staffForm.job_title || 'Team Member',
            passcode: staffForm.passcode
        };
        if (editingStaffId) {
            await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', editingStaffId), payload);
            logAction('UPDATE_USER', `Updated profile for ${staffForm.name}`);
        } else {
            const targetDept = payload.department_id || (policies[0] ? policies[0].department_id : 'dept_admin_00');
            await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users'), {
                ...payload,
                department_id: targetDept,
                avatar: getInitials(staffForm.name),
                color: getRandomColor(),
                custom_allowance: null,
                carry_over_days: 0
            });
            logAction('ADD_USER', `Added new user ${staffForm.name}`);
        }
        setIsStaffModalOpen(false);
    } catch (err) { console.error("Failed to save staff:", err); }
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!newDeptName) return;
    const deptId = `dept_${newDeptName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    try {
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'policies'), {
            department_id: deptId,
            name: newDeptName,
            allowance: parseInt(newDeptAllowance),
            carry_over: 5 
        });
        logAction('ADD_DEPT', `Created department ${newDeptName}`);
        setIsAddDeptOpen(false);
        setNewDeptName('');
        setNewDeptAllowance(25);
    } catch (err) { console.error("Failed to add dept:", err); }
  };

  const initiateDeleteUser = (user) => { setDeleteTarget({ type: 'user', id: user.id, name: user.name }); };
  const initiateDeletePolicy = (policy) => { setDeleteTarget({ type: 'policy', id: policy.id, name: policy.name }); };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'user') {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', deleteTarget.id));
        logAction('DELETE_USER', `Deleted user ${deleteTarget.name}`);
      } else {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', 'policies', deleteTarget.id));
        logAction('DELETE_DEPT', `Deleted department ${deleteTarget.name}`);
      }
      setDeleteTarget(null);
    } catch (err) { console.error("Delete operation failed:", err); }
  };

  const handleDecision = async (reqId, status) => {
    try {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'leave_requests', reqId), {
        status: status,
        approver_id: activeUser.id,
        approved_at: serverTimestamp()
      });
      logAction('DECISION', `${status} request ${reqId}`);
    } catch (err) { console.error("Update failed:", err); }
  };

  const handleUpdatePolicy = async (policyId, newValue) => {
    try {
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'policies', policyId), { allowance: parseInt(newValue) });
        logAction('UPDATE_POLICY', `Updated policy allowance to ${newValue}`);
    } catch (err) { console.error("Policy update failed:", err); }
  };

  const handleUpdateUserAllowance = async (userId, newValue) => {
      try {
        const val = newValue === '' ? null : parseInt(newValue);
        await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'users', userId), { custom_allowance: val });
        logAction('UPDATE_ALLOWANCE', `Updated custom allowance for user ${userId}`);
      } catch (err) { console.error("User allowance update failed:", err); }
  };

  // --- Calendar Helpers ---
  const handlePrevPeriod = () => { const newDate = new Date(calendarStartDate); newDate.setDate(newDate.getDate() - 21); setCalendarStartDate(newDate); };
  const handleNextPeriod = () => { const newDate = new Date(calendarStartDate); newDate.setDate(newDate.getDate() + 21); setCalendarStartDate(newDate); };
  const handleJumpToMonth = (monthIndex) => { const now = new Date(); const newDate = new Date(now.getFullYear(), monthIndex, 1); setCalendarStartDate(newDate); };

  // --- Derived State ---
  const myRequests = activeUser ? requests.filter(r => r.user_id === activeUser.id) : [];
  
  const pendingTeamRequests = activeUser ? requests.filter(r => {
      if (r.status !== 'PENDING') return false;
      if (activeRole === 'ADMIN') return true; 
      if (activeRole === 'MANAGER') return r.department_id === activeUser.department_id;
      return false;
  }) : [];
  
  const historyRequests = activeUser ? requests.filter(r => {
      if (r.status === 'PENDING') return false; 
      if (activeRole === 'ADMIN') return true;
      if (activeRole === 'MANAGER') return r.department_id === activeUser.department_id;
      return r.user_id === activeUser.id;
  }) : [];

  const myPolicy = policies.find(p => p.department_id === activeUser?.department_id) || { allowance: 25, name: 'General' };
  const baseAllowance = activeUser?.custom_allowance !== undefined && activeUser?.custom_allowance !== null ? activeUser.custom_allowance : myPolicy.allowance;
  const carryOver = activeUser?.carry_over_days || 0;
  const TOTAL_ALLOWANCE = baseAllowance + carryOver;
  
  const daysUsed = myRequests
    .filter(r => r.status === 'APPROVED' && r.leave_type !== 'SICKNESS') 
    .reduce((acc, curr) => acc + (curr.days_count || 0), 0);
  const daysRemaining = TOTAL_ALLOWANCE - daysUsed;

  const calendarDays = useMemo(() => {
    const days = [];
    for (let i = 0; i < 21; i++) { 
      const d = new Date(calendarStartDate);
      d.setDate(calendarStartDate.getDate() + i);
      days.push(d);
    }
    return days;
  }, [calendarStartDate]);
  
  const calendarUsers = useMemo(() => {
      let users = allUsers;
      if (activeRole === 'MEMBER') { users = allUsers.filter(u => u.role === 'MEMBER'); }
      else if (activeRole === 'MANAGER') { users = allUsers.filter(u => u.role !== 'ADMIN'); }
      else { users = allUsers.filter(u => u.role !== 'ADMIN'); }
      if (calendarDeptFilter !== 'ALL') { users = users.filter(u => u.department_id === calendarDeptFilter); }
      return users;
  }, [allUsers, activeRole, calendarDeptFilter]);


  // --- RENDER ---

  if (!activeUser) {
    return <LoginScreen onLogin={handleLogin} users={allUsers} />;
  }

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-900">
      
      {/* --- Top Navigation --- */}
      <nav className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold shadow-md ${activeRole === 'ADMIN' ? 'bg-rose-600 shadow-rose-200' : 'bg-indigo-600 shadow-indigo-200'}`}>L</div>
          <span className="font-bold text-lg tracking-tight text-slate-800">LeaveOS {activeRole === 'ADMIN' && <span className="text-xs bg-rose-100 text-rose-700 px-2 py-0.5 rounded-full ml-2">ADMIN</span>}</span>
        </div>

        <div className="flex items-center gap-4">
           <div className="flex items-center gap-3 pl-4 border-l border-slate-100">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-bold text-slate-800">{activeUser.name}</div>
                <div className="text-xs text-slate-500">
                    {activeUser.job_title || (activeRole === 'ADMIN' ? 'System Admin' : activeRole === 'MANAGER' ? 'Manager' : 'Team Member')}
                </div>
              </div>
              <div className={`w-9 h-9 rounded-full ${activeUser.color} flex items-center justify-center text-white font-bold text-xs ring-2 ring-white shadow-sm`}>
                {activeUser.avatar}
              </div>
           </div>
           <button onClick={handleLogout} className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-all" title="Sign Out"><LogOut className="w-5 h-5" /></button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6">
        
        {/* --- Header --- */}
        <header className="flex justify-between items-end mb-8">
          <div>
            <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900">
                    {activeRole === 'ADMIN' ? 'System Overview' : `Welcome back, ${activeUser.name.split(' ')[0]}`}
                </h1>
                {activeRole !== 'ADMIN' && <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold border border-indigo-100">{myPolicy.name} Dept</span>}
            </div>
            <p className="text-slate-500 text-sm mt-1">
              {activeRole === 'ADMIN' ? 'Manage infrastructure, security, and policies.' 
               : activeRole === 'MANAGER' ? 'Review your team coverage and approve requests.' 
               : 'Plan your time off and check your balance.'}
            </p>
          </div>
          <div className="flex gap-3">
              {activeRole === 'MEMBER' && (
                <button onClick={() => setIsBookingOpen(true)} className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-lg font-bold text-sm shadow-sm shadow-indigo-200 flex items-center gap-2 transition-all hover:-translate-y-0.5"><CalendarIcon className="w-4 h-4" /> Request Leave</button>
              )}
          </div>
        </header>

        {/* --- DASHBOARD CONTENT --- */}

        {activeRole === 'ADMIN' ? (
           <div className="grid grid-cols-1 gap-8">
              {/* 1. Stats Row */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                 <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase">Total Users</div>
                        <div className="text-2xl font-bold text-slate-900 mt-1">{allUsers.length}</div>
                    </div>
                    <div className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600"><Users className="w-5 h-5" /></div>
                 </div>
                 <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase">Departments</div>
                        <div className="text-2xl font-bold text-slate-900 mt-1">{policies.length}</div>
                    </div>
                    <div className="w-10 h-10 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-600"><Briefcase className="w-5 h-5" /></div>
                 </div>
                 <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase">Pending Approvals</div>
                        <div className="text-2xl font-bold text-indigo-600 mt-1">{pendingTeamRequests.length}</div>
                    </div>
                    <div className="w-10 h-10 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-600"><Bell className="w-5 h-5" /></div>
                 </div>
                 <div className="bg-gradient-to-br from-slate-800 to-slate-900 p-5 rounded-xl border border-slate-700 shadow-sm flex items-center justify-between cursor-pointer hover:shadow-md transition-all" onClick={() => setIsCalendarOpen(true)}>
                    <div>
                        <div className="text-xs font-bold text-slate-400 uppercase">Global Schedule</div>
                        <div className="text-sm font-bold text-white mt-1 flex items-center gap-1">View All Staff <ArrowRight className="w-3 h-3" /></div>
                    </div>
                    <div className="w-10 h-10 bg-slate-700/50 rounded-full flex items-center justify-center text-white"><CalendarDays className="w-5 h-5" /></div>
                 </div>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                 
                 {/* 2. Admin Approval Queue */}
                 <div className="lg:col-span-2 space-y-8">
                     {pendingTeamRequests.length > 0 && (
                         <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                             <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-indigo-50/50">
                                <div className="flex items-center gap-2">
                                    <ShieldAlert className="w-4 h-4 text-indigo-600" />
                                    <h3 className="font-bold text-slate-800">System-wide Approvals</h3>
                                </div>
                                <span className="text-xs font-bold bg-indigo-600 text-white px-2 py-0.5 rounded-full">{pendingTeamRequests.length} Pending</span>
                             </div>
                             <div className="p-0">
                                {pendingTeamRequests.map(req => (
                                    <div key={req.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 flex justify-between items-center">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">{req.user_avatar}</div>
                                            <div>
                                                <div className="font-bold text-sm text-slate-900 flex items-center gap-2">{req.user_name} {req.leave_type === 'SICKNESS' && <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1"><Stethoscope className="w-3 h-3"/> Sick Leave</span>}</div>
                                                <div className="text-xs text-slate-500">{formatDate(req.start_date)} - {formatDate(req.end_date)} ({req.days_count} days)</div>
                                            </div>
                                        </div>
                                        <div className="flex gap-2">
                                            <button onClick={() => handleDecision(req.id, 'REJECTED')} className="px-3 py-1 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded">Reject</button>
                                            <button onClick={() => handleDecision(req.id, 'APPROVED')} className="px-3 py-1 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded">Approve</button>
                                        </div>
                                    </div>
                                ))}
                             </div>
                         </div>
                     )}

                     {/* 3. Policy Management */}
                     <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                           <div className="flex items-center gap-2">
                               <Settings className="w-4 h-4 text-slate-500" />
                               <h3 className="font-bold text-slate-800">Department Policies</h3>
                           </div>
                           <div className="flex gap-2">
                                <button onClick={() => setIsRolloverConfirmOpen(true)} className="text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"><PlayCircle className="w-3 h-3" /> Year-End Rollover</button>
                                <button onClick={() => setIsAddDeptOpen(true)} className="text-xs font-bold text-rose-600 bg-rose-50 hover:bg-rose-100 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1"><Plus className="w-3 h-3" /> Add Dept</button>
                           </div>
                        </div>
                        <div className="p-0">
                           {policies.length === 0 ? (
                               <div className="p-8 text-center"><Building className="w-12 h-12 text-slate-200 mx-auto mb-2" /><p className="text-slate-500 text-sm font-medium">No departments yet.</p></div>
                           ) : (
                               <table className="w-full text-sm text-left">
                                  <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100">
                                     <tr><th className="p-4 pl-6">Department</th><th className="p-4">Default Allowance</th><th className="p-4 text-right pr-6">Actions</th></tr>
                                  </thead>
                                  <tbody>
                                     {policies.map(pol => (
                                        <tr key={pol.id} className="border-b border-slate-50 last:border-0">
                                           <td className="p-4 pl-6 font-bold text-slate-700 flex items-center gap-2"><Building className="w-4 h-4 text-slate-400" /> {pol.name}</td>
                                           <td className="p-4">
                                              <div className="flex items-center gap-2">
                                                 <input type="number" className="w-16 p-1 border border-slate-200 rounded text-center font-bold text-slate-700 focus:ring-2 focus:ring-rose-500 outline-none" value={pol.allowance} onChange={(e) => handleUpdatePolicy(pol.id, e.target.value)} />
                                                 <span className="text-xs text-slate-400">days</span>
                                              </div>
                                           </td>
                                           <td className="p-4 text-right pr-6">
                                               <button onClick={() => initiateDeletePolicy(pol)} className="text-slate-400 hover:text-rose-600 transition-colors p-1" title="Delete Department"><Trash2 className="w-4 h-4" /></button>
                                           </td>
                                        </tr>
                                     ))}
                                  </tbody>
                               </table>
                           )}
                        </div>
                     </div>

                     {/* 4. Employee Management */}
                     <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                           <div className="flex items-center gap-2"><Users className="w-4 h-4 text-slate-500" /><h3 className="font-bold text-slate-800">Staff Management</h3></div>
                           <button onClick={openAddStaffModal} className="text-xs font-bold text-slate-700 bg-white border border-slate-200 hover:bg-slate-50 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1 shadow-sm"><UserPlus className="w-3 h-3" /> Add Member</button>
                        </div>
                        <div className="p-0 max-h-[400px] overflow-y-auto">
                           <table className="w-full text-sm text-left">
                              <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-100 sticky top-0 z-10">
                                 <tr><th className="p-4 pl-6">Employee</th><th className="p-4">Department</th><th className="p-4">Allowance</th><th className="p-4 text-right pr-6">Actions</th></tr>
                              </thead>
                              <tbody>
                                 {allUsers.filter(u => u.role !== 'ADMIN').map(usr => {
                                    const isCustom = usr.custom_allowance !== null && usr.custom_allowance !== undefined;
                                    const deptName = policies.find(p => p.department_id === usr.department_id)?.name || 'Unknown';
                                    return (
                                        <tr key={usr.id} className="border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                                           <td className="p-4 pl-6">
                                              <div className="flex items-center gap-3">
                                                 <div className={`w-8 h-8 rounded-full ${usr.color} text-white flex items-center justify-center text-xs font-bold`}>{usr.avatar}</div>
                                                 <div><div className="font-bold text-slate-700">{usr.name}</div><div className="text-xs text-slate-400">{usr.job_title || (usr.role === 'MANAGER' ? 'Manager' : 'Member')}</div></div>
                                              </div>
                                           </td>
                                           <td className="p-4 text-slate-500"><span className="bg-slate-100 px-2 py-1 rounded text-xs font-medium">{deptName}</span></td>
                                           <td className="p-4">
                                              <div className="flex items-center gap-2">
                                                 <div className="relative">
                                                     <input type="number" placeholder="Default" className={`w-16 p-1.5 border rounded text-center font-bold outline-none focus:ring-2 focus:ring-rose-500 ${isCustom ? 'border-rose-300 bg-rose-50 text-rose-700' : 'border-slate-200 text-slate-500'}`} value={usr.custom_allowance ?? ''} onChange={(e) => handleUpdateUserAllowance(usr.id, e.target.value)} />
                                                     {isCustom && <div className="absolute -top-2 -right-2 w-2 h-2 bg-rose-500 rounded-full"></div>}
                                                 </div>
                                              </div>
                                           </td>
                                           <td className="p-4 text-right pr-6">
                                               <div className="flex justify-end gap-1">
                                                   <button onClick={() => openRecordAbsenceModal(usr.id)} className="text-amber-400 hover:text-amber-600 transition-colors p-1" title="Record Absence"><CalendarPlus className="w-4 h-4" /></button>
                                                   <button onClick={() => openEditStaffModal(usr)} className="text-slate-300 hover:text-indigo-600 transition-colors p-1"><Edit3 className="w-4 h-4" /></button>
                                                   <button onClick={() => initiateDeleteUser(usr)} className="text-slate-300 hover:text-rose-600 transition-colors p-1"><Trash2 className="w-4 h-4" /></button>
                                               </div>
                                           </td>
                                        </tr>
                                    );
                                 })}
                              </tbody>
                           </table>
                        </div>
                     </div>
                 </div>

                 {/* 5. System Audit Log (NEW) */}
                 <div className="bg-white rounded-xl border border-slate-200 shadow-sm flex flex-col h-full">
                    <div className="p-5 border-b border-slate-100 flex justify-between items-center">
                       <h3 className="font-bold text-slate-800">System Audit Log</h3>
                       <Archive className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="flex-1 overflow-y-auto max-h-[600px] p-0">
                       {logs.length === 0 && <div className="p-6 text-center text-slate-400 text-sm">No logs recorded yet.</div>}
                       {logs.map(log => (
                          <div key={log.id} className="p-4 border-b border-slate-50 hover:bg-slate-50 transition-colors text-xs">
                             <div className="flex justify-between items-start mb-1">
                                <span className="font-bold text-slate-700">{log.actor_name}</span>
                                <span className="text-slate-400">{log.timestamp ? new Date(log.timestamp.seconds * 1000).toLocaleString() : 'Just now'}</span>
                             </div>
                             <div className="flex items-center gap-2">
                                <span className="font-mono text-[10px] bg-slate-100 text-slate-500 px-1 rounded">{log.action}</span>
                                <span className="text-slate-600">{log.details}</span>
                             </div>
                          </div>
                       ))}
                    </div>
                 </div>
              </div>
           </div>
        ) : activeRole === 'MEMBER' ? (
          // ... MEMBER VIEW ...
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <div className="space-y-6">
               {/* Balance */}
               <div className="bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex items-center justify-between">
                  <div>
                    <span className="text-slate-500 text-xs font-bold uppercase tracking-wider">Allowance</span>
                    <div className="text-4xl font-bold text-slate-900 mt-2">{daysRemaining}</div>
                    <div className="text-sm text-slate-400 font-medium" title={`Base: ${baseAllowance}, Carry Over: ${carryOver}`}>days available</div>
                  </div>
                  <div className="relative w-20 h-20 flex items-center justify-center">
                     <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                        <path className="text-slate-100" d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                        <path className="text-indigo-500" strokeDasharray={`${Math.max(0, (daysRemaining/TOTAL_ALLOWANCE)*100)}, 100`} d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831" fill="none" stroke="currentColor" strokeWidth="3" />
                     </svg>
                  </div> 
               </div>
               {/* Team Schedule */}
               <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
                 <div className="flex items-start justify-between mb-4">
                    <div><h3 className="font-bold text-slate-800 text-sm flex items-center gap-2"><Users className="w-4 h-4 text-indigo-600" /> Team Schedule</h3><p className="text-xs text-slate-400 mt-1">Check who is off before booking.</p></div>
                 </div>
                 <div className="flex -space-x-2 mb-4 pl-2">
                    {allUsers.filter(u => u.id !== activeUser.id && u.role === 'MEMBER').slice(0, 5).map(u => (
                      <div key={u.id} className={`w-8 h-8 rounded-full border-2 border-white ${u.color} text-white text-[10px] flex items-center justify-center font-bold`} title={u.name}>{u.avatar}</div>
                    ))}
                 </div>
                 <button onClick={() => setIsCalendarOpen(true)} className="w-full py-2 text-xs font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors border border-slate-200 flex items-center justify-center gap-2"><CalendarDays className="w-3 h-3" /> View Full Calendar</button>
               </div>
             </div>
             {/* History */}
             <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-100 shadow-sm flex flex-col">
               <h3 className="font-bold text-slate-800 mb-4 text-sm flex items-center gap-2"><LayoutDashboard className="w-4 h-4 text-slate-400" /> My History</h3>
               <div className="space-y-3 flex-1">
                 {historyRequests.map(req => (
                   <div key={req.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors">
                      <div className="flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-lg border flex flex-col items-center justify-center shadow-sm ${req.leave_type === 'SICKNESS' ? 'bg-amber-50 border-amber-200' : 'bg-white border-slate-200'}`}>
                          {req.leave_type === 'SICKNESS' ? <Stethoscope className="w-4 h-4 text-amber-600"/> : <Palmtree className="w-4 h-4 text-indigo-600"/>}
                        </div>
                        <div><div className="text-sm font-bold text-slate-800">{formatDate(req.start_date)} - {formatDate(req.end_date)}</div><div className="text-xs text-slate-500 mt-0.5 italic">{req.reason}</div></div>
                      </div>
                      <div className="flex items-center gap-3">
                         <span className="text-xs font-medium text-slate-400">{req.days_count} days</span>
                         {req.status === 'APPROVED' && <span className="px-2.5 py-1 bg-emerald-100 text-emerald-700 text-xs rounded-full font-bold">Approved</span>}
                         {req.status === 'REJECTED' && <span className="px-2.5 py-1 bg-red-100 text-red-700 text-xs rounded-full font-bold">Rejected</span>}
                         {req.status === 'PENDING' && <span className="px-2.5 py-1 bg-slate-200 text-slate-600 text-xs rounded-full font-bold">Pending</span>}
                      </div>
                   </div>
                 ))}
               </div>
             </div>
          </div>
        ) : (
          // MANAGER VIEW
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
             <div className="lg:col-span-2 space-y-6">
                {/* Pending */}
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2"><Bell className="w-4 h-4 text-indigo-600" /> Pending Requests {pendingTeamRequests.length > 0 && <span className="bg-indigo-600 text-white px-2 py-0.5 rounded-full text-xs">{pendingTeamRequests.length}</span>}</h3>
                    <button onClick={openAddStaffModal} className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 px-4 py-2 rounded-lg font-bold text-xs shadow-sm flex items-center gap-2 transition-all"><UserPlus className="w-4 h-4 text-slate-500" /> Add Member</button>
                </div>
                
                {pendingTeamRequests.length === 0 && <div className="p-12 bg-white rounded-xl border border-slate-100 border-dashed flex flex-col items-center justify-center text-center"><div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center mb-3"><CheckCircle className="w-6 h-6 text-slate-300" /></div><p className="text-slate-500 text-sm font-medium">All caught up!</p></div>}
                {pendingTeamRequests.map(req => (
                  <div key={req.id} className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/50">
                      <div className="flex items-center gap-3"><div className="w-8 h-8 rounded-full bg-slate-200 flex items-center justify-center text-xs font-bold text-slate-600">{req.user_avatar}</div><div><div className="font-bold text-sm text-slate-900 flex items-center gap-2">{req.user_name}{req.leave_type === 'SICKNESS' && <span className="bg-amber-100 text-amber-800 text-[10px] px-1.5 py-0.5 rounded-full flex items-center gap-1"><Stethoscope className="w-3 h-3"/> Sick Leave</span>}</div><div className="text-xs text-slate-500">Requested {new Date(req.created_at?.seconds * 1000).toLocaleDateString()}</div></div></div>
                    </div>
                    <div className="p-4 grid grid-cols-2 gap-4">
                      <div><div className="text-xs text-slate-400 uppercase font-bold mb-1">Dates</div><div className="text-sm text-slate-800 font-medium">{formatDate(req.start_date)} — {formatDate(req.end_date)}</div><div className="text-xs text-slate-500 mt-0.5">{req.days_count} days</div></div>
                      <div><div className="text-xs text-slate-400 uppercase font-bold mb-1">Reason</div><div className="text-sm text-slate-800">{req.reason}</div></div>
                    </div>
                    <div className="p-3 bg-slate-50 flex justify-end gap-3 border-t border-slate-100">
                      <button onClick={() => handleDecision(req.id, 'REJECTED')} className="px-4 py-2 text-sm font-bold text-slate-600 hover:text-slate-800 hover:bg-slate-200 rounded-lg transition-colors">Reject</button>
                      <button onClick={() => handleDecision(req.id, 'APPROVED')} className="px-4 py-2 text-sm font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-lg shadow-sm transition-colors">Approve</button>
                    </div>
                  </div>
                ))}
             </div>
             <div className="space-y-6">
               <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                 <div className="text-xs font-bold text-slate-400 uppercase mb-4 tracking-wider">Status (Next 14 Days)</div>
                 <div className="space-y-3">
                    {allUsers.filter(u => u.role === 'MEMBER').slice(0, 6).map(u => {
                      const req = isUserOff(u.id, new Date(), requests);
                      const isAway = !!req;
                      const isSick = req?.leave_type === 'SICKNESS';
                      return (<div key={u.id} className="flex items-center justify-between pb-3 border-b border-slate-50 last:border-0 last:pb-0"><div className="flex items-center gap-3"><div className={`w-2 h-2 rounded-full ${isAway ? (isSick ? 'bg-amber-500' : 'bg-indigo-500') : 'bg-emerald-500'}`}></div><span className="text-sm font-medium text-slate-700">{u.name}</span></div><span className={`text-xs font-bold px-2 py-0.5 rounded ${isAway ? (isSick ? 'bg-amber-100 text-amber-700' : 'bg-indigo-100 text-indigo-700') : 'bg-emerald-50 text-emerald-600'}`}>{isAway ? (isSick ? 'Sick' : 'Holiday') : 'Active'}</span></div>)
                    })}
                 </div>
                 <button onClick={() => setIsCalendarOpen(true)} className="w-full mt-6 py-2.5 text-xs font-bold text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors border border-indigo-100">View Full Schedule</button>
               </div>

               {/* Staff Management for Manager */}
               <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                  <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-slate-800 flex items-center gap-2"><Users className="w-4 h-4 text-indigo-600" /> My Team</h3></div>
                  <div className="space-y-2 max-h-[250px] overflow-y-auto">
                      {allUsers.filter(u => u.role !== 'ADMIN' && u.department_id === activeUser.department_id).map(u => (
                          <div key={u.id} className="flex justify-between items-center p-2 hover:bg-slate-50 rounded-lg border border-transparent hover:border-slate-100 transition-all group">
                              <div className="flex items-center gap-2"><div className={`w-6 h-6 rounded-full ${u.color} text-white flex items-center justify-center text-[10px] font-bold`}>{u.avatar}</div><span className="text-xs font-bold text-slate-700">{u.name}</span></div>
                              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                   <button onClick={() => openRecordAbsenceModal(u.id)} className="text-amber-400 hover:text-amber-600 p-1 rounded hover:bg-amber-50" title="Record Sickness"><CalendarPlus className="w-3 h-3" /></button>
                                   <button onClick={() => openEditStaffModal(u)} className="text-slate-400 hover:text-indigo-600 p-1 rounded hover:bg-indigo-50" title="Edit"><Edit3 className="w-3 h-3" /></button>
                              </div>
                          </div>
                      ))}
                  </div>
               </div>
               
               {/* Team History */}
               <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
                 <div className="flex items-center justify-between mb-4"><h3 className="font-bold text-slate-800 flex items-center gap-2"><History className="w-4 h-4 text-indigo-600" /> Team History</h3></div>
                 <div className="space-y-3 max-h-[300px] overflow-y-auto">
                     {historyRequests.length === 0 && <div className="text-xs text-slate-400 text-center">No history.</div>}
                     {historyRequests.slice(0,5).map(req => (
                         <div key={req.id} className="text-xs border-b border-slate-50 pb-2">
                             <div className="flex justify-between items-center"><div className="flex items-center gap-1"><span className="font-bold text-slate-700">{req.user_name}</span>{req.leave_type === 'SICKNESS' && <Stethoscope className="w-3 h-3 text-amber-500"/>}</div><span className={`px-2 py-0.5 rounded ${req.status === 'APPROVED' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>{req.status}</span></div>
                             <div className="flex justify-between mt-1 text-slate-400"><span>{formatDate(req.start_date)}</span><span className="italic max-w-[100px] truncate">{req.reason}</span></div>
                         </div>
                     ))}
                 </div>
               </div>
             </div>
          </div>
        )}
      </main>

      {/* --- Delete Confirmation Modal (Unchanged) --- */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden p-6 text-center">
             <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4"><Trash2 className="w-6 h-6 text-red-600" /></div>
             <h3 className="text-lg font-bold text-slate-900 mb-2">Confirm Deletion</h3>
             <p className="text-sm text-slate-500 mb-6">Are you sure you want to delete <strong className="text-slate-800">{deleteTarget.name}</strong>? This action cannot be undone.</p>
             <div className="flex gap-3">
               <button onClick={() => setDeleteTarget(null)} className="flex-1 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
               <button onClick={confirmDelete} className="flex-1 py-2.5 text-sm font-bold text-white bg-red-600 hover:bg-red-700 rounded-xl shadow-lg shadow-red-200 transition-colors">Delete</button>
             </div>
          </div>
        </div>
      )}

      {/* --- Rollover Confirmation Modal --- */}
      {isRolloverConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden p-6">
             <div className="flex items-center gap-3 mb-4">
                 <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center"><PlayCircle className="w-6 h-6 text-indigo-600" /></div>
                 <h3 className="text-lg font-bold text-slate-900">Confirm Year-End Rollover</h3>
             </div>
             <div className="text-sm text-slate-600 space-y-3 mb-6">
                 <p>This action will:</p>
                 <ul className="list-disc pl-5 space-y-1">
                     <li>Calculate remaining leave for ALL staff.</li>
                     <li>Apply carry-over limits (max 5 days per policy).</li>
                     <li>Update <strong>Carry Over</strong> balances for the new year.</li>
                 </ul>
                 <p className="text-xs text-slate-400 mt-2">Please ensure all 2024 leave requests are approved/rejected before running this.</p>
             </div>
             <div className="flex gap-3">
               <button onClick={() => setIsRolloverConfirmOpen(false)} className="flex-1 py-2.5 text-sm font-bold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors">Cancel</button>
               <button onClick={handleYearEndRollover} className="flex-1 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200 transition-colors">Run Rollover</button>
             </div>
          </div>
        </div>
      )}

      {/* --- Booking Modal --- */}
      {isBookingOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
               <h2 className="text-lg font-bold text-slate-900">Book Time Off</h2>
               <button onClick={() => setIsBookingOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><XCircle className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleBookLeave} className="p-6 space-y-5">
               <div className="flex p-1 bg-slate-100 rounded-lg">
                   <button type="button" onClick={() => setLeaveType('HOLIDAY')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${leaveType === 'HOLIDAY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}><Palmtree className="w-4 h-4"/> Holiday</button>
                   <button type="button" onClick={() => setLeaveType('SICKNESS')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${leaveType === 'SICKNESS' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500'}`}><Stethoscope className="w-4 h-4"/> Sickness</button>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Date</label>
                   <input type="date" required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700" value={startDate} onChange={e => setStartDate(e.target.value)} />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">End Date</label>
                   <input type="date" required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700" value={endDate} onChange={e => setEndDate(e.target.value)} />
                 </div>
               </div>
               {startDate && endDate && (
                   <div className={`p-4 rounded-lg border flex justify-between items-center ${leaveType === 'SICKNESS' ? 'bg-amber-50 border-amber-100' : 'bg-indigo-50 border-indigo-100'}`}>
                       <span className={`text-sm font-bold ${leaveType === 'SICKNESS' ? 'text-amber-900' : 'text-indigo-900'}`}>{leaveType === 'SICKNESS' ? 'Days Recorded (Not Deducted):' : 'Days Deducted from Allowance:'}</span>
                       <span className={`text-xl font-bold ${leaveType === 'SICKNESS' ? 'text-amber-600' : 'text-indigo-600'}`}>{calculatedDays} days</span>
                   </div>
               )}
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reason</label>
                  <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none" placeholder={leaveType === 'SICKNESS' ? "Reason for absence..." : "Summer vacation, etc..."} value={reason} onChange={e => setReason(e.target.value)} required></textarea>
               </div>
               <div className="pt-2">
                 <button type="submit" className={`w-full text-white py-3 rounded-xl font-bold text-sm shadow-lg transition-all transform active:scale-[0.98] ${leaveType === 'SICKNESS' ? 'bg-amber-600 hover:bg-amber-700 shadow-amber-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}>Submit Request</button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Record Absence Modal (Unchanged) --- */}
      {isRecordAbsenceOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-amber-50">
               <div className="flex items-center gap-2"><Stethoscope className="w-5 h-5 text-amber-600" /><h2 className="text-lg font-bold text-slate-900">Record Absence</h2></div>
               <button onClick={() => setIsRecordAbsenceOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><XCircle className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleRecordAbsence} className="p-6 space-y-5">
               <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-800"><span className="font-bold">Note:</span> You are recording this on behalf of <strong>{allUsers.find(u => u.id === targetUserId)?.name}</strong>. It will be automatically approved.</div>
               <div className="flex p-1 bg-slate-100 rounded-lg">
                   <button type="button" onClick={() => setLeaveType('HOLIDAY')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${leaveType === 'HOLIDAY' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}><Palmtree className="w-4 h-4"/> Holiday</button>
                   <button type="button" onClick={() => setLeaveType('SICKNESS')} className={`flex-1 py-2 text-xs font-bold rounded-md transition-all flex items-center justify-center gap-2 ${leaveType === 'SICKNESS' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-500'}`}><Stethoscope className="w-4 h-4"/> Sickness</button>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Start Date</label>
                   <input type="date" required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700" value={startDate} onChange={e => setStartDate(e.target.value)} />
                 </div>
                 <div>
                   <label className="block text-xs font-bold text-slate-500 uppercase mb-1">End Date</label>
                   <input type="date" required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700" value={endDate} onChange={e => setEndDate(e.target.value)} />
                 </div>
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Reason</label>
                  <textarea className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none h-24 resize-none" placeholder="Reason for absence..." value={reason} onChange={e => setReason(e.target.value)} required></textarea>
               </div>
               <div className="pt-2">
                 <button type="submit" className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-bold text-sm shadow-lg transition-all transform active:scale-[0.98]">Record & Approve</button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Shared Add/Edit Staff Modal --- */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
               <h2 className="text-lg font-bold text-slate-900">{editingStaffId ? 'Edit Team Member' : 'Add Team Member'}</h2>
               <button onClick={() => setIsStaffModalOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><XCircle className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleSaveStaff} className="p-6 space-y-5">
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Full Name</label>
                 <input type="text" required placeholder="e.g. Sarah Designer" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700" value={staffForm.name} onChange={e => setStaffForm({...staffForm, name: e.target.value})} />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Job Title</label>
                 <input type="text" required placeholder="e.g. Product Designer" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700" value={staffForm.job_title} onChange={e => setStaffForm({...staffForm, job_title: e.target.value})} />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Role</label>
                 <div className="grid grid-cols-2 gap-2">
                    <button type="button" onClick={() => setStaffForm({...staffForm, role: 'MEMBER'})} className={`px-3 py-2 rounded-lg text-sm font-bold border transition-all ${staffForm.role === 'MEMBER' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}>Member</button>
                    <button type="button" onClick={() => setStaffForm({...staffForm, role: 'MANAGER'})} className={`px-3 py-2 rounded-lg text-sm font-bold border transition-all ${staffForm.role === 'MANAGER' ? 'bg-indigo-50 border-indigo-500 text-indigo-700' : 'bg-white border-slate-200 text-slate-600'}`}>Manager</button>
                 </div>
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Passcode (4-digits)</label>
                 <div className="relative">
                    <KeyRound className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                    <input type="text" maxLength={4} required className="w-full border border-slate-200 rounded-lg pl-10 pr-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700 tracking-widest" value={staffForm.passcode} onChange={e => setStaffForm({...staffForm, passcode: e.target.value})} />
                 </div>
               </div>
               <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Department</label>
                  {activeRole === 'ADMIN' ? (
                      <>
                        {policies.length > 0 ? (
                            <select className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 outline-none font-medium text-slate-700 bg-white" value={staffForm.department_id} onChange={(e) => setStaffForm({...staffForm, department_id: e.target.value})}>
                                {policies.map(p => <option key={p.id} value={p.department_id}>{p.name}</option>)}
                            </select>
                        ) : (
                            <div className="p-3 bg-amber-50 border border-amber-100 rounded-lg text-xs text-amber-700 font-medium">No departments found. Please create a department first.</div>
                        )}
                      </>
                  ) : (
                      <div className="w-full border border-slate-100 bg-slate-50 rounded-lg px-3 py-2 text-sm font-medium text-slate-500">{policies.find(p => p.department_id === staffForm.department_id)?.name || 'Your Department'}</div>
                  )}
               </div>
               <div className="pt-2">
                 <button type="submit" disabled={activeRole === 'ADMIN' && policies.length === 0} className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-300 disabled:cursor-not-allowed text-white py-3 rounded-xl font-bold text-sm shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2">
                    {editingStaffId ? <Save className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                    {editingStaffId ? 'Save Changes' : 'Create Profile'}
                 </button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Add Department Modal --- */}
      {isAddDeptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white w-full max-w-sm rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
               <h2 className="text-lg font-bold text-slate-900">New Department</h2>
               <button onClick={() => setIsAddDeptOpen(false)} className="text-slate-400 hover:text-slate-600 transition-colors"><XCircle className="w-6 h-6" /></button>
            </div>
            <form onSubmit={handleAddDepartment} className="p-6 space-y-5">
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Department Name</label>
                 <input type="text" required placeholder="e.g. Marketing" className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 outline-none font-medium text-slate-700" value={newDeptName} onChange={e => setNewDeptName(e.target.value)} />
               </div>
               <div>
                 <label className="block text-xs font-bold text-slate-500 uppercase mb-1">Default Allowance (Days)</label>
                 <input type="number" required className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-rose-500 outline-none font-medium text-slate-700" value={newDeptAllowance} onChange={e => setNewDeptAllowance(e.target.value)} />
               </div>
               <div className="pt-2">
                 <button type="submit" className="w-full bg-rose-600 hover:bg-rose-700 text-white py-3 rounded-xl font-bold text-sm shadow-lg shadow-rose-200 transition-all transform active:scale-[0.98] flex items-center justify-center gap-2"><Plus className="w-4 h-4" /> Create Department</button>
               </div>
            </form>
          </div>
        </div>
      )}

      {/* --- Team Calendar Modal (With Filters & Month Jump) --- */}
      {isCalendarOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-md p-4 animate-in zoom-in-95 duration-200">
           <div className="bg-white w-full max-w-6xl max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl flex flex-col">
             <div className="p-6 border-b border-slate-100 flex justify-between items-center bg-white z-10">
                <div className="flex items-center gap-4">
                    <div>
                      <h2 className="text-lg font-bold text-slate-900">{activeRole === 'ADMIN' ? 'Global Schedule' : 'Team Schedule'}</h2>
                      <p className="text-slate-500 text-xs mt-0.5 font-medium">
                        {calendarDays[0]?.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} — {calendarDays[calendarDays.length - 1]?.toLocaleDateString('en-US', { month: 'long', day: 'numeric' })}
                      </p>
                    </div>
                    <select className="ml-4 bg-slate-50 border border-slate-200 text-slate-700 text-xs font-bold rounded-lg p-2 outline-none" onChange={(e) => handleJumpToMonth(parseInt(e.target.value))} value={calendarStartDate.getMonth()}>
                        {MONTHS.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                    {(activeRole === 'ADMIN' || activeRole === 'MANAGER') && (
                         <div className="flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg p-1">
                            <Filter className="w-3 h-3 text-slate-400 ml-2"/>
                            <select 
                                className="bg-transparent text-slate-700 text-xs font-bold outline-none p-1"
                                value={calendarDeptFilter}
                                onChange={(e) => setCalendarDeptFilter(e.target.value)}
                            >
                                <option value="ALL">All Departments</option>
                                {policies.map(p => <option key={p.id} value={p.department_id}>{p.name}</option>)}
                            </select>
                         </div>
                    )}
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center bg-slate-100 rounded-lg p-1 border border-slate-200">
                      <button onClick={handlePrevPeriod} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-500 hover:text-slate-700"><ChevronLeft className="w-4 h-4" /></button>
                      <span className="text-xs font-bold px-3 text-slate-600 select-none">3 Weeks</span>
                      <button onClick={handleNextPeriod} className="p-1.5 hover:bg-white hover:shadow-sm rounded-md transition-all text-slate-500 hover:text-slate-700"><ChevronRight className="w-4 h-4" /></button>
                    </div>
                    <button onClick={() => setIsCalendarOpen(false)} className="bg-slate-100 hover:bg-slate-200 p-2 rounded-full text-slate-500 transition-colors"><XCircle className="w-5 h-5" /></button>
                </div>
             </div>
             <div className="flex-1 overflow-auto p-6">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr>
                      <th className="p-3 text-left w-40 sticky left-0 bg-white z-20 border-b border-slate-100 text-slate-400 font-bold uppercase text-xs tracking-wider">Employee</th>
                      {calendarDays.map((d, i) => {
                        const isWknd = isWeekend(d);
                        const isToday = isSameDay(d, new Date());
                        return (
                          <th key={i} className={`p-2 text-center min-w-[44px] border-b border-slate-100 sticky top-0 bg-white z-10 ${isWknd ? 'bg-slate-50/50' : ''}`}>
                            <div className={`text-[10px] font-bold uppercase mb-1 ${isToday ? 'text-indigo-600' : 'text-slate-400'}`}>{d.toLocaleDateString('en-US', { weekday: 'short' })}</div>
                            <div className={`text-sm font-bold w-8 h-8 rounded-full flex items-center justify-center mx-auto ${isToday ? 'bg-indigo-600 text-white shadow-md shadow-indigo-200' : 'text-slate-700'}`}>{d.getDate()}</div>
                          </th>
                        )
                      })}
                    </tr>
                  </thead>
                  <tbody>
                    {calendarUsers.map(user => (
                      <tr key={user.id} className="group hover:bg-slate-50/50 transition-colors">
                        <td className="p-3 text-left sticky left-0 bg-white group-hover:bg-slate-50/50 z-10 border-b border-slate-50">
                          <div className="flex items-center gap-3">
                            <div className={`w-8 h-8 rounded-full ${user.color} text-white flex items-center justify-center text-xs font-bold`}>{user.avatar}</div>
                            <div>
                                <div className="font-bold text-slate-700">{user.name.split(' ')[0]}</div>
                                {activeRole === 'ADMIN' && <div className="text-[9px] font-bold text-slate-400 bg-slate-100 inline-block px-1 rounded mt-0.5">{policies.find(p => p.department_id === user.department_id)?.name?.substring(0,3).toUpperCase() || 'UNK'}</div>}
                            </div>
                          </div>
                        </td>
                        {calendarDays.map((d, i) => {
                          const req = isUserOff(user.id, d, requests);
                          const isWknd = isWeekend(d);
                          const isSick = req?.leave_type === 'SICKNESS';
                          return (
                            <td key={i} className={`p-1 border-b border-slate-50 ${isWknd ? 'bg-slate-50/30' : ''}`}>
                              <div className={`h-10 rounded-lg flex items-center justify-center transition-all ${req ? (isSick ? 'bg-amber-100 text-amber-600 shadow-sm' : 'bg-indigo-100 text-indigo-600 shadow-sm') : isWknd ? 'bg-slate-100/40' : ''}`}>
                                {req && <span className="text-[10px] font-bold">{isSick ? 'SICK' : 'OFF'}</span>}
                              </div>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
             </div>
           </div>
        </div>
      )}
    </div>
  );
}
