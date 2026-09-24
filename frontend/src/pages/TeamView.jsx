import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getUsers, createUser, updateUser, deleteUser } from '../services/api';
import { useUser } from '../contexts/UserContext';
import { UserPlus, ShieldCheck, User as UserIcon, Edit2, Trash2, X, Eye, EyeOff } from 'lucide-react';
import { DeleteConfirmationModal } from '../components/DeleteConfirmationModal';
import { toast } from 'sonner';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

const userSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters"),
  fullName: z.string().min(3, "Full name must be at least 3 characters"),
  password: z.string().min(6, "Password must be at least 6 characters").optional().or(z.literal('')),
  role: z.string(), // Allowing flexibility for different modules
  status: z.enum(['active', 'inactive']),
  preferredShift: z.enum(['day', 'night', 'both']).optional()
});

export function TeamView() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isViewMode, setIsViewMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null, name: '' });
  const { user: currentUser, isSuperAdmin } = useUser();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: zodResolver(userSchema),
    defaultValues: {
      username: '',
      fullName: '',
      password: '',
      role: 'cashier',
      status: 'active',
      preferredShift: 'day'
    }
  });

  const fetchUsers = async () => {
    try {
      const data = await getUsers(currentUser?.role);
      setUsers(data);
    } catch (err) {
      toast.error("Failed to load team members");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenModal = (user = null, viewOnly = false) => {
    // Force immediate state updates
    setShowPassword(false);
    setIsViewMode(viewOnly);
    setEditingUser(user);

    if (user) {
      reset({
        username: user.username || '',
        fullName: user.fullName || '',
        password: '',
        role: user.role || 'cashier',
        status: user.status || 'active',
        preferredShift: user.preferredShift || 'day'
      });
    } else {
      // For new members, ensure a complete purge of stale data
      reset({
        username: '',
        fullName: '',
        password: '',
        role: 'cashier',
        status: 'active',
        preferredShift: 'day'
      }, { keepDefaultValues: false });
    }

    setIsModalOpen(true);
  };

  // Renamed to avoid conflict with hook form's handleSubmit
  const onSubmit = async (data) => {
    try {
      if (editingUser) {
        // Remove password from update if it's empty
        const updateData = { ...data };
        if (!updateData.password) delete updateData.password;

        await updateUser(editingUser._id, updateData, currentUser?.role);
        toast.success("Team member updated!");
      } else {
        await createUser(data, currentUser?.role);
        toast.success("Team member added!");
      }
      setIsModalOpen(false);
      fetchUsers();
    } catch (err) {
      toast.error(err.message || "Operation failed");
    }
  };

  const handleDeleteClick = (user) => {
    setDeleteModal({
      isOpen: true,
      id: user._id,
      name: user.fullName
    });
  };

  const handleConfirmDelete = async () => {
    if (!deleteModal.id) return;
    setIsDeleting(true);
    try {
      await deleteUser(deleteModal.id, currentUser?.role);
      toast.success("Member removed from sector");
      setDeleteModal({ isOpen: false, id: null, name: '' });
      fetchUsers();
    } catch (err) {
      toast.error("Deletion authorization failed");
    } finally {
      setIsDeleting(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: 'spring',
        stiffness: 100
      }
    }
  };

  return (
    <div className="space-y-6 sm:space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-700">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between pb-6 sm:pb-8 border-b border-[var(--color-border-subtle)] gap-4">
        <div className="w-full">
          <h1 className="text-xl sm:text-2xl md:text-4xl font-black text-[var(--color-text-primary)] tracking-tighter uppercase leading-none">
            Team Management
          </h1>
          <div className="text-[var(--color-text-muted)] font-bold uppercase text-[9px] sm:text-[10px] tracking-[0.2em] sm:tracking-[0.4em] mt-2 sm:mt-3 flex items-center gap-2">
            <div className="w-1.5 h-1.5 bg-green-500 rounded-full animate-pulse"></div>
            Staff Accounts & Access Control
          </div>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="w-full md:w-auto px-4 py-3 sm:px-8 sm:py-4 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-primary-hover)] text-[var(--color-text-primary)] rounded-xl sm:rounded-2xl font-black text-[10px] sm:text-xs uppercase tracking-[0.1em] sm:tracking-[0.2em] shadow-xl sm:shadow-2xl shadow-[var(--color-primary)]/20 hover:scale-[1.05] active:scale-95 transition-all flex items-center justify-center gap-2 sm:gap-3 shrink-0"
        >
          <UserPlus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span className="whitespace-nowrap">Add Member</span>
        </button>
      </div>

      {/* Main Content Grid */}
      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 bg-surface-card rounded-[2.5rem] border border-[var(--color-border-subtle)]">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-500 mb-4"></div>
          <p className="text-[10px] font-black text-[var(--color-text-muted)] uppercase tracking-widest">Identifying Team Personnel...</p>
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8"
          variants={containerVariants}
          initial="hidden"
          animate="visible"
        >
          {users.map((u) => (
            <motion.div
              key={u._id}
              variants={itemVariants}
              whileHover={{
                y: -5,
                transition: { duration: 0.2 },
                boxShadow: "0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)"
              }}
              className="bg-surface-card p-8 rounded-xl shadow-2xl border border-[var(--color-border-subtle)] group/card relative overflow-hidden transition-shadow"
            >
              <div className="flex justify-between items-start mb-8 relative z-10">
                <div className={`p-4 bg-[var(--color-surface-base)] rounded-2xl border border-[var(--color-border-subtle)]`}>
                  {['admin', 'shop_admin', 'super_admin'].includes(u.role) ? <ShieldCheck className="w-7 h-7 text-[var(--color-primary)]" /> : <UserIcon className="w-7 h-7 text-[var(--color-primary)]" />}
                </div>
                <div className="flex gap-2 transition-opacity">
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleOpenModal(u, true)} className="p-3 bg-[var(--color-surface-base)] rounded-xl border border-[var(--color-border-subtle)] hover:text-green-500 hover:border-green-500/30 transition-colors"><Eye className="w-5 h-5" /></motion.button>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleOpenModal(u)} className="p-3 bg-[var(--color-surface-base)] rounded-xl border border-[var(--color-border-subtle)] hover:text-amber-500 hover:border-amber-500/30 transition-colors"><Edit2 className="w-5 h-5" /></motion.button>
                  <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={() => handleDeleteClick(u)} disabled={u._id === currentUser?.id} className="p-3 bg-[var(--color-surface-base)] rounded-xl border border-[var(--color-border-subtle)] disabled:opacity-20 hover:text-rose-500 hover:border-rose-500/30 transition-colors"><Trash2 className="w-5 h-5" /></motion.button>
                </div>
              </div>
              <h3 className="text-2xl font-black text-[var(--color-text-primary)] uppercase tracking-tighter">{u.fullName}</h3>
              <p className="text-[11px] font-black text-[var(--color-text-muted)] uppercase tracking-widest mb-4">@{u.username}</p>
              <div className="flex gap-2">
                <span className="text-[9px] font-black uppercase px-3 py-1 bg-green-500/10 text-green-500 rounded-full">{u.role}</span>
                <span className={`text-[9px] font-black uppercase px-3 py-1 rounded-full ${u.status === 'active' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'}`}>{u.status}</span>
              </div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Add/Edit Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-zinc-900/40"
              onClick={() => setIsModalOpen(false)}
            />
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="bg-surface-card rounded-[2.5rem] shadow-2xl w-[90%] sm:w-[420px] relative z-70 border border-[var(--color-border-subtle)] flex flex-col max-h-[90vh]"
            >
              <div className="p-7 border-b border-[var(--color-border-subtle)] relative">
                <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all">
                  <X className="w-5 h-5" />
                </button>
                <h2 className="text-2xl font-black uppercase tracking-tighter italic mr-8">
                  {isViewMode ? "User Profile" : editingUser ? "Update User" : "Add User"}
                </h2>
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="py-2 px-7 space-y-6 overflow-y-auto" autoComplete="off">
                <div className="space-y-1">
                  <div>
                    <label className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest pl-1">Full Identity Name</label>
                    <input {...register("fullName")} autoComplete="off" disabled={isViewMode} className="w-full px-4 py-[6px] bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] rounded-xl outline-none" />
                    {errors.fullName && <p className="text-red-500 text-[10px] mt-1">{errors.fullName.message}</p>}
                  </div>

                  <div>
                    <label className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest pl-1">System Handle</label>
                    <input {...register("username")} autoComplete="off" disabled={isViewMode} className="w-full px-4 py-[6px] bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] rounded-xl outline-none" />
                    {errors.username && <p className="text-red-500 text-[10px] mt-1">{errors.username.message}</p>}
                  </div>

                  <div className="space-y-1">
                    <label className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest pl-1">Access Pass</label>
                    <div className="relative">
                      <input type={showPassword ? "text" : "password"} {...register("password")} autoComplete="new-password" disabled={isViewMode} className="w-full px-4 py-2 pr-10 bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] rounded-xl outline-none focus:border-[var(--color-primary)]/40 transition-all font-bold text-sm tracking-widest" />
                      <button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 text-[var(--color-text-muted)] hover:text-[var(--color-primary)] transition-colors">
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {errors.password && <p className="text-rose-500 text-[10px] pl-1 font-bold">{errors.password.message}</p>}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest pl-1">Auth Tier</label>
                      <select {...register("role")} disabled={isViewMode} className="w-full px-4 py-2 bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] rounded-xl outline-none">
                        <option value="cashier">Cashier</option>
                        <option value="shop_admin">Shop Admin</option>
                        {isSuperAdmin && <option value="super_admin">Super Admin</option>}
                      </select>
                    </div>
                    <div>
                      <label className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest pl-1">System State</label>
                      <select {...register("status")} disabled={isViewMode} className="w-full px-4 py-2 bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] rounded-xl outline-none">
                        <option value="active">Active</option>
                        <option value="inactive">Suspended</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-[8px] font-black text-[var(--color-text-muted)] uppercase tracking-widest pl-1">Operational Shift</label>
                    <select {...register("preferredShift")} disabled={isViewMode} className="w-full px-4 py-2 bg-[var(--color-surface-base)] border border-[var(--color-border-subtle)] rounded-xl outline-none">
                      <option value="day">Day Shift</option>
                      <option value="night">Night Shift</option>
                      <option value="both">Flexible / Both</option>
                    </select>
                    {errors.preferredShift && <p className="text-rose-500 text-[10px] mt-1 pl-1 font-bold">{errors.preferredShift.message}</p>}
                  </div>
                </div>

                {!isViewMode && (
                  <button type="submit" disabled={isSubmitting} className="w-full py-3 mb-4 bg-green-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-green-700 active:scale-[0.98] transition-all">
                    {isSubmitting ? "Processing..." : editingUser ? "Finalize Update" : "Authorize Member"}
                  </button>
                )}
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <DeleteConfirmationModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ ...deleteModal, isOpen: false })}
        onConfirm={handleConfirmDelete}
        itemName={deleteModal.name}
        isDeleting={isDeleting}
      />
    </div>
  );
}