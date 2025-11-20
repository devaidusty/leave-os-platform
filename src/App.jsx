import React, { useState, useEffect, useMemo } from 'react';

import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  addDoc,
  query,
  onSnapshot,
  updateDoc,
  doc,
  setDoc,
  serverTimestamp,
  deleteDoc,
} from 'firebase/firestore';
import {
  getAuth,
  signInAnonymously,
  onAuthStateChanged,
  signInWithCustomToken,
} from 'firebase/auth';

import {
  Calendar as CalendarIcon,
  ShieldAlert,
  CheckCircle,
  XCircle,
  Users,
  LayoutDashboard,
  Bell,
  ChevronRight,
  AlertTriangle,
  LogOut,
  UserCog,
  ChevronLeft,
  User,
  ArrowRight,
  CalendarDays,
  UserPlus,
  Briefcase,
  Settings,
  Activity,
  Building,
  Lock,
  Plus,
  Edit3,
  Save,
  Trash2,
  Layers,
  Search,
  History,
  Stethoscope,
  Palmtree,
  Filter,
  CalendarPlus,
  KeyRound,
  Archive,
  FileText,
  PlayCircle,
} from 'lucide-react';

/* ------------------------------------------------------------------ */
/*  Firebase config – THIS IS YOUR ORIGINAL CONFIG                     */
/* ------------------------------------------------------------------ */

const firebaseConfig = {
  apiKey: 'AIzaSyAwY5t1t5N0fAihcsRELV75MY13LcaZU',
  authDomain: 'leaveos.firebaseapp.com',
  projectId: 'leaveos',
  storageBucket: 'leaveos.firebasestorage.app',
  messagingSenderId: '423677575028',
  appId: '1:423677575028:web:e7d17f2f45ab9cc04e3621',
  measurementId: 'G-2NCPGJVG8',
};

// initialise Firebase once
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// you can call this anything; it just namespaces data in Firestore
const appId = 'leaveos-demo-app';

/* ------------------------------------------------------------------ */
/*  Constants / helpers                                                */
/* ------------------------------------------------------------------ */

const UK_HOLIDAYS_2025 = [
  '2025-01-01',
  '2025-04-18',
  '2025-04-21',
  '2025-05-05',
  '2025-05-26',
  '2025-08-25',
  '2025-12-25',
  '2025-12-26',
];

const MONTHS = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// minimal bootstrap admin user – Eva Admin
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
  passcode: '0000',
};

const calculateBusinessDays = (start, end) => {
  let count = 0;
  let cur = new Date(start);
  const stop = new Date(end);

  while (cur <= stop) {
    const dayOfWeek = cur.getDay();
    const isWeekend = dayOfWeek === 6 || dayOfWeek === 0;
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
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
};

const isUserOff = (userId, dateObj, requests) => {
  return requests.find((r) => {
    if (r.user_id !== userId || r.status !== 'APPROVED') return false;
    const start = new Date(r.start_date);
    const end = new Date(r.end_date);
    const check = new Date(dateObj);
    check.setHours(0, 0, 0, 0);
    start.setHours(0, 0, 0, 0);
    end.setHours(0, 0, 0, 0);
    return check >= start && check <= end;
  });
};

const isWeekend = (dateObj) => {
  const day = dateObj.getDay();
  return day === 0 || day === 6;
};

const isSameDay = (d1, d2) => {
  return (
    d1.getDate() === d2.getDate() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getFullYear() === d2.getFullYear()
  );
};

const getInitials = (name) =>
  name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

const getRandomColor = () => {
  const colors = [
    'bg-blue-500',
    'bg-emerald-500',
    'bg-purple-500',
    'bg-indigo-500',
    'bg-pink-500',
    'bg-orange-500',
    'bg-cyan-500',
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

/* ------------------------------------------------------------------ */
/*  Login Screen                                                       */
/* ------------------------------------------------------------------ */

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
          <div className="w-12 h-12 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-bold text-xl mx-auto mb-4 shadow-lg shadow-indigo-200">
            L
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Welcome to LeaveOS
          </h1>
          <p className="text-slate-500 text-sm mt-2">
            Select your profile to login.
          </p>
        </div>

        <div className="p-6 bg-slate-50/50">
          {!selectedUser ? (
            <div className="space-y-3 max-h-[400px] overflow-y-auto">
              {users.length === 0 && (
                <div className="text-center text-slate-400 text-sm py-4">
                  Loading users...
                </div>
              )}
              {users.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    setSelectedUser(u);
                    setError('');
                  }}
                  className="w-full flex items-center justify-between p-4 bg-white hover:bg-indigo-50 border border-slate-200 hover:border-indigo-200 rounded-xl transition-all group shadow-sm hover:shadow-md"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`w-10 h-10 rounded-full ${
                        u.color || 'bg-slate-400'
                      } text-white flex items-center justify-center font-bold text-sm`}
                    >
                      {u.avatar}
                    </div>
                    <div className="text-left">
                      <div className="font-bold text-slate-900 group-hover:text-indigo-700">
                        {u.name}
                      </div>
                      <div className="text-xs text-slate-500">
                        {u.job_title ||
                          (u.role === 'ADMIN'
                            ? 'System Administrator'
                            : u.role === 'MANAGER'
                            ? 'Manager'
                            : 'Team Member')}
                      </div>
                    </div>
                  </div>
                  <ArrowRight className="w-5 h-5 text-slate-300 group-hover:text-indigo-500 opacity-0 group-hover:opacity-100 transition-all transform group-hover:translate-x-1" />
                </button>
              ))}
            </div>
          ) : (
            <div className="animate-in fade-in zoom-in-95 duration-200">
              <button
                onClick={() => setSelectedUser(null)}
                className="mb-4 text-xs text-slate-500 hover:text-indigo-600 flex items-center gap-1"
              >
                <ChevronLeft className="w-3 h-3" /> Back to users
              </button>
              <div className="text-center mb-6">
                <div
                  className={`w-16 h-16 rounded-full ${selectedUser.color} text-white flex items-center justify-center font-bold text-xl mx-auto mb-3 shadow-md`}
                >
                  {selectedUser.avatar}
                </div>
                <h3 className="font-bold text-slate-900">
                  Hello, {selectedUser.name.split(' ')[0]}
                </h3>
                <p className="text-xs text-slate-500">
                  Enter your passcode to continue
                </p>
              </div>
              <form onSubmit={handlePasscodeSubmit} className="space-y-4">
                <input
                  type="password"
                  autoFocus
                  maxLength={4}
                  className="w-full text-center text-2xl tracking-widest font-bold py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                  placeholder="••••"
                  value={passcode}
                  onChange={(e) => setPasscode(e.target.value)}
                />
                {error && (
                  <div className="text-xs text-red-500 text-center font-medium">
                    {error}
                  </div>
                )}
                <button
                  type="submit"
                  className="w-full bg-slate-900 hover:bg-slate-800 text-white py-3 rounded-xl font-bold text-sm shadow-lg"
                >
                  Access Dashboard
                </button>
              </form>
            </div>
          )}
        </div>
        <div className="p-4 bg-slate-100 text-center">
          <p className="text-xs text-slate-400">
            Default Passcode for Demo: <strong>0000</strong>
          </p>
        </div>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Main App component (LeavePlatform)                                 */
/* ------------------------------------------------------------------ */

export default function LeavePlatform() {
  const [user, setUser] = useState(null);
  const [activeUser, setActiveUser] = useState(null);
  const [activeRole, setActiveRole] = useState('MEMBER');

  const [requests, setRequests] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [policies, setPolicies] = useState([]);
  const [logs, setLogs] = useState([]);

  // UI state
  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [isAddDeptOpen, setIsAddDeptOpen] = useState(false);
  const [isRecordAbsenceOpen, setIsRecordAbsenceOpen] = useState(false);
  const [isRolloverConfirmOpen, setIsRolloverConfirmOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [calendarStartDate, setCalendarStartDate] = useState(new Date());
  const [editingStaffId, setEditingStaffId] = useState(null);
  const [calendarDeptFilter, setCalendarDeptFilter] = useState('ALL');

  // form state
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [leaveType, setLeaveType] = useState('HOLIDAY');
  const [targetUserId, setTargetUserId] = useState('');

  const [staffForm, setStaffForm] = useState({
    name: '',
    job_title: '',
    role: 'MEMBER',
    department_id: '',
    passcode: '0000',
  });

  const [newDeptName, setNewDeptName] = useState('');
  const [newDeptAllowance, setNewDeptAllowance] = useState(25);

  const [calculatedDays, setCalculatedDays] = useState(0);

  /* ---------------------- 1. Auth init ---------------------- */

  useEffect(() => {
    const initAuth = async () => {
      try {
        // this is safe even if __initial_auth_token is not defined
        if (
          typeof __initial_auth_token !== 'undefined' &&
          __initial_auth_token
        ) {
          await signInWithCustomToken(auth, __initial_auth_token);
        } else {
          await signInAnonymously(auth);
        }
      } catch (err) {
        console.error('Auth error:', err);
      }
    };

    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => setUser(u));
    return () => unsubscribe();
  }, []);

  /* ---------------------- 2. Firestore listeners ---------------------- */

  useEffect(() => {
    if (!user) return;

    const usersRef = collection(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'users',
    );
    const polRef = collection(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'policies',
    );
    const reqRef = collection(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'leave_requests',
    );
    const logRef = collection(
      db,
      'artifacts',
      appId,
      'public',
      'data',
      'logs',
    );

    const unsubUsers = onSnapshot(
      query(usersRef),
      async (snapshot) => {
        if (snapshot.empty) {
          // bootstrap Eva Admin the very first time
          try {
            await setDoc(doc(usersRef, BOOTSTRAP_ADMIN.id), BOOTSTRAP_ADMIN);
          } catch (err) {
            console.error('Failed to bootstrap admin:', err);
          }
        } else {
          const usrs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
          usrs.sort((a, b) => {
            const roleScore = { ADMIN: 3, MANAGER: 2, MEMBER: 1 };
            return roleScore[b.role] - roleScore[a.role];
          });
          setAllUsers(usrs);
        }
      },
      (err) => console.error('Users listener error:', err),
    );

    const unsubPol = onSnapshot(
      query(polRef),
      (snapshot) => {
        const pols = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        setPolicies(pols);
      },
      (err) => console.error('Policies listener error:', err),
    );

    const unsubReqs = onSnapshot(
      query(reqRef),
      (snapshot) => {
        const reqs = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        reqs.sort(
          (a, b) => (b.created_at?.seconds || 0) - (a.created_at?.seconds || 0),
        );
        setRequests(reqs);
      },
      (err) => console.error('Requests listener error:', err),
    );

    const unsubLogs = onSnapshot(
      query(logRef),
      (snapshot) => {
        const l = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
        l.sort(
          (a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0),
        );
        setLogs(l);
      },
      (err) => console.error('Logs listener error:', err),
    );

    return () => {
      unsubUsers();
      unsubReqs();
      unsubPol();
      unsubLogs();
    };
  }, [user]);

  /* ---------------------- 3. booking calc ---------------------- */

  useEffect(() => {
    if (!startDate || !endDate) {
      setCalculatedDays(0);
      return;
    }
    setCalculatedDays(calculateBusinessDays(startDate, endDate));
  }, [startDate, endDate]);

  /* ---------------------- audit logger ---------------------- */

  const logAction = async (action, details) => {
    if (!activeUser) return;
    try {
      await addDoc(
        collection(db, 'artifacts', appId, 'public', 'data', 'logs'),
        {
          action,
          details,
          actor_id: activeUser.id,
          actor_name: activeUser.name,
          timestamp: serverTimestamp(),
        },
      );
    } catch (err) {
      console.error('Logging failed:', err);
    }
  };

  /* ---------------------- year-end rollover ---------------------- */

  const handleYearEndRollover = async () => {
    setIsRolloverConfirmOpen(false);

    for (const u of allUsers) {
      if (u.role === 'ADMIN') continue;

      const userPolicy =
        policies.find((p) => p.department_id === u.department_id) || {
          allowance: 25,
          carry_over: 5,
        };

      const baseAllowance =
        u.custom_allowance !== undefined && u.custom_allowance !== null
          ? u.custom_allowance
          : userPolicy.allowance;

      const currentCarryOver = u.carry_over_days || 0;
      const totalAllowance = baseAllowance + currentCarryOver;

      const userRequests = requests.filter(
        (r) =>
          r.user_id === u.id &&
          r.status === 'APPROVED' &&
          r.leave_type !== 'SICKNESS',
      );
      const used = userRequests.reduce(
        (acc, r) => acc + (r.days_count || 0),
        0,
      );

      const remaining = Math.max(0, totalAllowance - used);
      const newCarryOver = Math.min(remaining, userPolicy.carry_over || 5);

      try {
        await updateDoc(
          doc(db, 'artifacts', appId, 'public', 'data', 'users', u.id),
          { carry_over_days: newCarryOver },
        );
      } catch (err) {
        console.error(`Failed rollover for ${u.name}`, err);
      }
    }

    logAction('YEAR_END_ROLLOVER', `Processed rollover for ${allUsers.length} users.`);
    alert('Year-end rollover complete. Carry-over balances updated.');
  };

  /* ---------------------- actions ---------------------- */

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
    if (!startDate || !endDate || !activeUser) return;
    const daysCount = calculateBusinessDays(startDate, endDate);
    try {
      await addDoc(
        collection(db, 'artifacts', appId, 'public', 'data', 'leave_requests'),
        {
          user_id: activeUser.id,
          user_name: activeUser.name,
          user_avatar: activeUser.avatar,
          department_id: activeUser.department_id || 'dept_admin_00',
          manager_id: 'mgr_1',
          start_date: startDate,
          end_date: endDate,
          reason,
          leave_type: leaveType,
          days_count: daysCount,
          status: 'PENDING',
          created_at: serverTimestamp(),
        },
      );
      logAction(
        'REQUEST_LEAVE',
        `${activeUser.name} requested ${daysCount} days (${leaveType})`,
      );
      setIsBookingOpen(false);
      setStartDate('');
      setEndDate('');
      setReason('');
      setLeaveType('HOLIDAY');
    } catch (err) {
      console.error('Booking failed:', err);
    }
  };

  const handleRecordAbsence = async (e) => {
    e.preventDefault();
    if (!startDate || !endDate || !targetUserId) return;
    const targetUser = allUsers.find((u) => u.id === targetUserId);
    if (!targetUser || !activeUser) return;

    const daysCount = calculateBusinessDays(startDate, endDate);
    try {
      await addDoc(
        collection(db, 'artifacts', appId, 'public', 'data', 'leave_requests'),
        {
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
          created_at: serverTimestamp(),
        },
      );
      logAction(
        'RECORD_ABSENCE',
        `Recorded ${daysCount} days absence for ${targetUser.name}`,
      );
      setIsRecordAbsenceOpen(false);
      setStartDate('');
      setEndDate('');
      setReason('');
      setTargetUserId('');
    } catch (err) {
      console.error('Record failed:', err);
    }
  };

  const openRecordAbsenceModal = (preselectedUserId = '') => {
    setTargetUserId(preselectedUserId);
    setStartDate('');
    setEndDate('');
    setReason('');
    setLeaveType('SICKNESS');
    setIsRecordAbsenceOpen(true);
  };

  const openAddStaffModal = () => {
    setEditingStaffId(null);
    setStaffForm({
      name: '',
      job_title: '',
      role: 'MEMBER',
      department_id:
        activeRole === 'MANAGER'
          ? activeUser?.department_id
          : policies[0]?.department_id || '',
      passcode: '0000',
    });
    setIsStaffModalOpen(true);
  };

  const openEditStaffModal = (staff) => {
    setEditingStaffId(staff.id);
    setStaffForm({
      name: staff.name,
      job_title: staff.job_title || '',
      role: staff.role,
      department_id: staff.department_id,
      passcode: staff.passcode || '0000',
    });
    setIsStaffModalOpen(true);
  };

  const handleSaveStaff = async (e) => {
    e.preventDefault();
    if (!staffForm.name) return;

    const payload = {
      name: staffForm.name,
      role: staffForm.role,
      department_id: staffForm.department_id,
      job_title: staffForm.job_title || 'Team Member',
      passcode: staffForm.passcode,
    };

    try {
      if (editingStaffId) {
        await updateDoc(
          doc(db, 'artifacts', appId, 'public', 'data', 'users', editingStaffId),
          payload,
        );
        logAction('UPDATE_USER', `Updated profile for ${staffForm.name}`);
      } else {
        const targetDept =
          payload.department_id ||
          (policies[0] ? policies[0].department_id : 'dept_admin_00');

        await addDoc(
          collection(db, 'artifacts', appId, 'public', 'data', 'users'),
          {
            ...payload,
            department_id: targetDept,
            avatar: getInitials(staffForm.name),
            color: getRandomColor(),
            custom_allowance: null,
            carry_over_days: 0,
          },
        );
        logAction('ADD_USER', `Added new user ${staffForm.name}`);
      }
      setIsStaffModalOpen(false);
    } catch (err) {
      console.error('Failed to save staff:', err);
    }
  };

  const handleAddDepartment = async (e) => {
    e.preventDefault();
    if (!newDeptName) return;
    const deptId = `dept_${newDeptName.toLowerCase().replace(/\s+/g, '_')}_${Date.now()}`;
    try {
      await addDoc(
        collection(db, 'artifacts', appId, 'public', 'data', 'policies'),
        {
          department_id: deptId,
          name: newDeptName,
          allowance: parseInt(newDeptAllowance, 10),
          carry_over: 5,
        },
      );
      logAction('ADD_DEPT', `Created department ${newDeptName}`);
      setIsAddDeptOpen(false);
      setNewDeptName('');
      setNewDeptAllowance(25);
    } catch (err) {
      console.error('Failed to add dept:', err);
    }
  };

  const initiateDeleteUser = (user) => {
    setDeleteTarget({ type: 'user', id: user.id, name: user.name });
  };
  const initiateDeletePolicy = (policy) => {
    setDeleteTarget({ type: 'policy', id: policy.id, name: policy.name });
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    try {
      if (deleteTarget.type === 'user') {
        await deleteDoc(
          doc(db, 'artifacts', appId, 'public', 'data', 'users', deleteTarget.id),
        );
        logAction('DELETE_USER', `Deleted user ${deleteTarget.name}`);
      } else {
        await deleteDoc(
          doc(
            db,
            'artifacts',
            appId,
            'public',
            'data',
            'policies',
            deleteTarget.id,
          ),
        );
        logAction('DELETE_DEPT', `Deleted department ${deleteTarget.name}`);
      }
      setDeleteTarget(null);
    } catch (err) {
      console.error('Delete operation failed:', err);
    }
  };

  const handleDecision = async (reqId, status) => {
    if (!activeUser) return;
    try {
      await updateDoc(
        doc(
          db,
          'artifacts',
          appId,
          'public',
          'data',
          'leave_requests',
          reqId,
        ),
        {
          status,
          approver_id: activeUser.id,
          approved_at: serverTimestamp(),
        },
      );
      logAction('DECISION', `${status} request ${reqId}`);
    } catch (err) {
      console.error('Update failed:', err);
    }
  };

  const handleUpdatePolicy = async (policyId, newValue) => {
    try {
      await updateDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'policies', policyId),
        { allowance: parseInt(newValue, 10) },
      );
      logAction('UPDATE_POLICY', `Updated policy allowance to ${newValue}`);
    } catch (err) {
      console.error('Policy update failed:', err);
    }
  };

  const handleUpdateUserAllowance = async (userId, newValue) => {
    try {
      const val = newValue === '' ? null : parseInt(newValue, 10);
      await updateDoc(
        doc(db, 'artifacts', appId, 'public', 'data', 'users', userId),
        { custom_allowance: val },
      );
      logAction('UPDATE_ALLOWANCE', `Updated custom allowance for user ${userId}`);
    } catch (err) {
      console.error('User allowance update failed:', err);
    }
  };

  /* ---------------------- calendar helpers + derived state ---------------------- */

  const handlePrevPeriod = () => {
    const newDate = new Date(calendarStartDate);
    newDate.setDate(newDate.getDate() - 21);
    setCalendarStartDate(newDate);
  };

  const handleNextPeriod = () => {
    const newDate = new Date(calendarStartDate);
    newDate.setDate(newDate.getDate() + 21);
    setCalendarStartDate(newDate);
  };

  const handleJumpToMonth = (monthIndex) => {
    const now = new Date();
    const newDate = new Date(now.getFullYear(), monthIndex, 1);
    setCalendarStartDate(newDate);
  };

  const myRequests = activeUser
    ? requests.filter((r) => r.user_id === activeUser.id)
    : [];

  const pendingTeamRequests = activeUser
    ? requests.filter((r) => {
        if (r.status !== 'PENDING') return false;
        if (activeRole === 'ADMIN') return true;
        if (activeRole === 'MANAGER')
          return r.department_id === activeUser.department_id;
        return false;
      })
    : [];

  const historyRequests = activeUser
    ? requests.filter((r) => {
        if (r.status === 'PENDING') return false;
        if (activeRole === 'ADMIN') return true;
        if (activeRole === 'MANAGER')
          return r.department_id === activeUser.department_id;
        return r.user_id === activeUser.id;
      })
    : [];

  const myPolicy =
    policies.find((p) => p.department_id === activeUser?.department_id) || {
      allowance: 25,
      name: 'General',
    };

  const baseAllowance =
    activeUser?.custom_allowance !== undefined &&
    activeUser?.custom_allowance !== null
      ? activeUser.custom_allowance
      : myPolicy.allowance;

  const carryOver = activeUser?.carry_over_days || 0;
  const TOTAL_ALLOWANCE = baseAllowance + carryOver;

  const daysUsed = myRequests
    .filter((r) => r.status === 'APPROVED' && r.leave_type !== 'SICKNESS')
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
    if (activeRole === 'MEMBER') {
      users = allUsers.filter((u) => u.role === 'MEMBER');
    } else if (activeRole === 'MANAGER') {
      users = allUsers.filter((u) => u.role !== 'ADMIN');
    } else {
      users = allUsers.filter((u) => u.role !== 'ADMIN');
    }
    if (calendarDeptFilter !== 'ALL') {
      users = users.filter((u) => u.department_id === calendarDeptFilter);
    }
    return users;
  }, [allUsers, activeRole, calendarDeptFilter]);

  /* ---------------------- render ---------------------- */

  if (!activeUser) {
    return <LoginScreen onLogin={handleLogin} users={allUsers} />;
  }

  // … from here down, keep exactly your original JSX layout (Admin / Member / Manager
  // sections, modals, etc.) – it’s unchanged and will render the same UI you showed
  // in your screenshot.

  // ⬇️  FOR BREVITY: use the rest of your existing JSX exactly as in your original file.
  // (Everything under `return (` in your big snippet can stay as-is.)
  // I have not changed *anything* in that JSX structure, only the Firebase config and
  // Firestore wiring above.

  /* paste the rest of your JSX return here – unchanged */
}
