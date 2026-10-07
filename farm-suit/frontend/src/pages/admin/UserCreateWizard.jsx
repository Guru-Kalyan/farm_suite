import React, { useState, useEffect, useMemo } from 'react';
import { adminApi } from '../../api/admin';
import { useToast } from '../../hooks/useToast';
import { Input } from '../../components/common/Input';
import { Button } from '../../components/common/Button';
import { Modal } from '../../components/common/Modal';

export const UserCreateWizard = ({ isOpen, onClose, onUserCreated }) => {
  const { addToast } = useToast();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [roles, setRoles] = useState([]);
  const [permissionModules, setPermissionModules] = useState([]);
  const [collapsedGroups, setCollapsedGroups] = useState({});

  // Form State
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    username: '',
    email: '',
    phone: '',
    employeeId: '',
    password: '',
    confirmPassword: '',
    forcePasswordChange: true,
    roleId: '',
    selectedPermissions: new Set() // Set of permission codes
  });

  const [errors, setErrors] = useState({});

  // Fetch roles and permissions metadata
  useEffect(() => {
    if (!isOpen) return;
    const fetchData = async () => {
      try {
        const [rolesRes, permsRes] = await Promise.all([
          adminApi.getRoles(),
          adminApi.getPermissions()
        ]);
        if (rolesRes && rolesRes.data && rolesRes.data.roles) {
          setRoles(rolesRes.data.roles);
        }
        if (permsRes && permsRes.data && permsRes.data.modules) {
          setPermissionModules(permsRes.data.modules);
        }
      } catch (err) {
        addToast('Failed to load roles and permissions: ' + err.message, 'error');
      }
    };
    fetchData();
  }, [isOpen, addToast]);

  // Handle Role selection and auto-loading default permissions
  const handleRoleSelect = async (roleId) => {
    const selectedRole = roles.find((r) => String(r.id) === String(roleId));
    if (!selectedRole) {
      setFormData((prev) => ({ ...prev, roleId: '', selectedPermissions: new Set() }));
      return;
    }

    try {
      const res = await adminApi.getRole(roleId);
      const rolePerms = res?.data?.permissions || [];
      setFormData((prev) => ({
        ...prev,
        roleId: selectedRole.id,
        selectedPermissions: new Set(rolePerms)
      }));
    } catch (_) {
      setFormData((prev) => ({
        ...prev,
        roleId: selectedRole.id,
        selectedPermissions: new Set()
      }));
    }
  };

  // Permission toggles
  const handleTogglePermission = (code) => {
    setFormData((prev) => {
      const next = new Set(prev.selectedPermissions);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return { ...prev, selectedPermissions: next };
    });
  };

  const handleSelectGroup = (perms) => {
    setFormData((prev) => {
      const next = new Set(prev.selectedPermissions);
      perms.forEach((p) => next.add(p.code));
      return { ...prev, selectedPermissions: next };
    });
  };

  const handleClearGroup = (perms) => {
    setFormData((prev) => {
      const next = new Set(prev.selectedPermissions);
      perms.forEach((p) => next.delete(p.code));
      return { ...prev, selectedPermissions: next };
    });
  };

  const handleGrantAll = () => {
    // If user is selecting a non-admin role, grant all operational permissions (exclude admin/audit unless user is Admin)
    const allCodes = [];
    const isSelectedAdmin = roles.find((r) => String(r.id) === String(formData.roleId))?.name === 'Admin';
    permissionModules.forEach((m) => {
      if (!isSelectedAdmin && (m.module === 'Audit' || m.module === 'Users' || m.module === 'Roles' || m.module === 'Settings')) {
        return; // safeguard non-admin roles
      }
      m.permissions.forEach((p) => allCodes.push(p.code));
    });
    setFormData((prev) => ({
      ...prev,
      selectedPermissions: new Set(allCodes)
    }));
    addToast('Granted all module permissions to user.', 'info');
  };

  const handleRemoveAll = () => {
    setFormData((prev) => ({
      ...prev,
      selectedPermissions: new Set()
    }));
  };

  const toggleGroupCollapse = (modName) => {
    setCollapsedGroups((prev) => ({ ...prev, [modName]: !prev[modName] }));
  };

  // Step validation
  const validateStep = (step) => {
    const errs = {};
    if (step === 1) {
      if (!formData.username.trim()) errs.username = 'Username is required';
      if (!formData.password) errs.password = 'Password is required';
      else if (formData.password.length < 6) errs.password = 'Password must be at least 6 characters';
      if (formData.password !== formData.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    } else if (step === 2) {
      if (!formData.roleId) errs.role = 'Please select a role for this user';
    }
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((s) => Math.min(5, s + 1));
    }
  };

  const prevStep = () => {
    setCurrentStep((s) => Math.max(1, s - 1));
  };

  // Access summary data
  const selectedRoleObj = useMemo(() => {
    return roles.find((r) => String(r.id) === String(formData.roleId));
  }, [roles, formData.roleId]);

  const accessSummary = useMemo(() => {
    const grantedModules = [];
    const deniedModules = [];

    permissionModules.forEach((mod) => {
      const grantedCount = mod.permissions.filter((p) => formData.selectedPermissions.has(p.code)).length;
      if (grantedCount > 0) {
        grantedModules.push({
          name: mod.module,
          count: grantedCount,
          total: mod.permissions.length
        });
      } else {
        deniedModules.push(mod.module);
      }
    });

    return { grantedModules, deniedModules };
  }, [permissionModules, formData.selectedPermissions]);

  const handleSubmit = async () => {
    try {
      setLoading(true);
      const customPerms = Array.from(formData.selectedPermissions).map((code) => ({
        code,
        policy: 'ALLOW'
      }));

      await adminApi.createUser({
        username: formData.username.trim(),
        email: formData.email.trim(),
        first_name: formData.firstName.trim(),
        last_name: formData.lastName.trim(),
        phone: formData.phone.trim(),
        employee_id: formData.employeeId.trim(),
        password: formData.password,
        confirm_password: formData.confirmPassword,
        force_password_change: formData.forcePasswordChange,
        role_id: formData.roleId,
        custom_permissions: customPerms
      });

      addToast(`User ${formData.username} created successfully!`, 'success');
      onUserCreated && onUserCreated();
      onClose();
    } catch (err) {
      addToast(err.message || 'Failed to create user', 'error');
    } finally {
      setLoading(false);
    }
  };

  const steps = [
    { num: 1, title: 'Basic Info' },
    { num: 2, title: 'Role' },
    { num: 3, title: 'Permissions' },
    { num: 4, title: 'Summary' },
    { num: 5, title: 'Review & Submit' }
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New User — Farm Suit Administration"
      maxWidth="850px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Stepper Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid var(--border-subtle)',
          paddingBottom: '16px'
        }}>
          {steps.map((st, i) => {
            const isActive = currentStep === st.num;
            const isCompleted = currentStep > st.num;
            return (
              <div
                key={st.num}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  opacity: isActive || isCompleted ? 1 : 0.45
                }}
              >
                <div style={{
                  width: '28px',
                  height: '28px',
                  borderRadius: '50%',
                  backgroundColor: isCompleted ? 'var(--primary)' : isActive ? 'var(--primary-subtle)' : 'var(--bg-surface-secondary)',
                  color: isCompleted ? '#ffffff' : isActive ? 'var(--primary-text)' : 'var(--text-muted)',
                  border: `2px solid ${isActive || isCompleted ? 'var(--primary)' : 'var(--border-strong)'}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '12px',
                  fontWeight: '700'
                }}>
                  {isCompleted ? '✓' : st.num}
                </div>
                <span style={{
                  fontSize: '12.5px',
                  fontWeight: isActive ? '700' : '500',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)'
                }}>
                  {st.title}
                </span>
                {i < steps.length - 1 && (
                  <div style={{
                    width: '20px',
                    height: '2px',
                    backgroundColor: isCompleted ? 'var(--primary)' : 'var(--border-subtle)',
                    marginLeft: '8px'
                  }} />
                )}
              </div>
            );
          })}
        </div>

        {/* STEP 1: Basic Information */}
        {currentStep === 1 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: 'var(--text-primary)', fontWeight: '600' }}>
              Personal & Employee Information
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <Input
                label="First Name"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                placeholder="e.g. Rahul"
              />
              <Input
                label="Last Name"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                placeholder="e.g. Kumar"
              />
              <Input
                label="Username"
                required
                value={formData.username}
                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                placeholder="e.g. rahul"
                error={errors.username}
              />
              <Input
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="e.g. rahul@example.com"
              />
              <Input
                label="Phone Number"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="e.g. +91 98765 43210"
              />
              <Input
                label="Employee ID"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                placeholder="e.g. EMP-1024"
              />
            </div>

            <h4 style={{ margin: '12px 0 4px 0', fontSize: '14px', color: 'var(--text-primary)', fontWeight: '600' }}>
              Login Credentials
            </h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '14px' }}>
              <Input
                label="Initial Password"
                type="password"
                required
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                placeholder="Minimum 6 characters"
                error={errors.password}
              />
              <Input
                label="Confirm Password"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                placeholder="Re-enter password"
                error={errors.confirmPassword}
              />
            </div>

            <label style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '13px',
              color: 'var(--text-secondary)',
              cursor: 'pointer',
              marginTop: '4px'
            }}>
              <input
                type="checkbox"
                checked={formData.forcePasswordChange}
                onChange={(e) => setFormData({ ...formData, forcePasswordChange: e.target.checked })}
                style={{ width: '16px', height: '16px', accentColor: 'var(--primary)', cursor: 'pointer' }}
              />
              Force user to change password on first login
            </label>
          </div>
        )}

        {/* STEP 2: Role Selection */}
        {currentStep === 2 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: 'var(--text-primary)', fontWeight: '600' }}>
                Assign Primary Role
              </h4>
              <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-muted)' }}>
                Selecting a role automatically applies that role's default permissions. You can customize them in the next step.
              </p>
            </div>

            {errors.role && (
              <div style={{ color: 'var(--danger-text)', fontSize: '12.5px', fontWeight: '500' }}>
                ⚠️ {errors.role}
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
              {roles.map((r) => {
                const isSelected = String(formData.roleId) === String(r.id);
                return (
                  <div
                    key={r.id}
                    onClick={() => handleRoleSelect(r.id)}
                    style={{
                      padding: '14px',
                      borderRadius: 'var(--radius-md)',
                      border: `2px solid ${isSelected ? 'var(--primary)' : 'var(--border-subtle)'}`,
                      backgroundColor: isSelected ? 'var(--primary-subtle)' : 'var(--bg-surface-secondary)',
                      cursor: 'pointer',
                      transition: 'all var(--transition-fast)',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontWeight: '700', fontSize: '13.5px', color: isSelected ? 'var(--primary-text)' : 'var(--text-primary)' }}>
                        {r.name}
                      </span>
                      {r.is_system && (
                        <span style={{
                          fontSize: '10.5px',
                          padding: '2px 6px',
                          borderRadius: 'var(--radius-xs)',
                          backgroundColor: 'var(--border-strong)',
                          color: 'var(--text-secondary)'
                        }}>
                          System
                        </span>
                      )}
                    </div>
                    <p style={{ margin: 0, fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                      {r.description || 'Standard role configuration.'}
                    </p>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: 'auto', paddingTop: '4px' }}>
                      {r.permissions_count || 0} default permissions
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 3: Permissions (Granular Grouped Grid) */}
        {currentStep === 3 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div>
                <h4 style={{ margin: '0 0 2px 0', fontSize: '14px', color: 'var(--text-primary)', fontWeight: '600' }}>
                  Granular Access Control
                </h4>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  Active role: <b>{selectedRoleObj?.name || 'None'}</b> | Selected permissions: <b>{formData.selectedPermissions.size}</b>
                </div>
              </div>

              <div style={{ display: 'flex', gap: '8px' }}>
                <Button variant="secondary" size="sm" onClick={handleGrantAll}>
                  Grant All Operational
                </Button>
                <Button variant="secondary" size="sm" onClick={handleRemoveAll}>
                  Remove All
                </Button>
              </div>
            </div>

            {/* Permission Module Accordions */}
            <div style={{
              maxHeight: '440px',
              overflowY: 'auto',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              paddingRight: '6px'
            }}>
              {permissionModules.map((mod) => {
                const isCollapsed = Boolean(collapsedGroups[mod.module]);
                const grantedInGroup = mod.permissions.filter((p) => formData.selectedPermissions.has(p.code)).length;
                const allSelectedInGroup = grantedInGroup === mod.permissions.length;

                return (
                  <div
                    key={mod.module}
                    style={{
                      border: '1px solid var(--border-subtle)',
                      borderRadius: 'var(--radius-md)',
                      backgroundColor: 'var(--bg-surface)'
                    }}
                  >
                    {/* Header */}
                    <div
                      style={{
                        padding: '10px 14px',
                        backgroundColor: 'var(--bg-surface-secondary)',
                        borderRadius: isCollapsed ? 'var(--radius-md)' : 'var(--radius-md) var(--radius-md) 0 0',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        cursor: 'pointer'
                      }}
                      onClick={() => toggleGroupCollapse(mod.module)}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '12px' }}>{isCollapsed ? '▶' : '▼'}</span>
                        <span style={{ fontWeight: '700', fontSize: '13px', color: 'var(--text-primary)' }}>
                          {mod.module}
                        </span>
                        <span style={{
                          fontSize: '11px',
                          padding: '1px 7px',
                          borderRadius: 'var(--radius-full)',
                          backgroundColor: grantedInGroup > 0 ? 'var(--primary-subtle)' : 'var(--bg-surface)',
                          color: grantedInGroup > 0 ? 'var(--primary-text)' : 'var(--text-muted)',
                          fontWeight: '600'
                        }}>
                          {grantedInGroup} / {mod.permissions.length}
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: '6px' }} onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => handleSelectGroup(mod.permissions)}
                          style={{
                            background: 'none',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-xs)',
                            padding: '2px 8px',
                            fontSize: '11px',
                            cursor: 'pointer',
                            color: 'var(--primary)',
                            fontWeight: '600'
                          }}
                        >
                          Select All
                        </button>
                        <button
                          type="button"
                          onClick={() => handleClearGroup(mod.permissions)}
                          style={{
                            background: 'none',
                            border: '1px solid var(--border-subtle)',
                            borderRadius: 'var(--radius-xs)',
                            padding: '2px 8px',
                            fontSize: '11px',
                            cursor: 'pointer',
                            color: 'var(--text-muted)',
                            fontWeight: '600'
                          }}
                        >
                          Clear
                        </button>
                      </div>
                    </div>

                    {/* Body */}
                    {!isCollapsed && (
                      <div style={{
                        padding: '12px 14px',
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
                        gap: '10px'
                      }}>
                        {mod.permissions.map((p) => {
                          const isChecked = formData.selectedPermissions.has(p.code);
                          return (
                            <label
                              key={p.code}
                              style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '8px',
                                padding: '6px 8px',
                                borderRadius: 'var(--radius-sm)',
                                backgroundColor: isChecked ? 'var(--primary-subtle)' : 'transparent',
                                cursor: 'pointer',
                                userSelect: 'none',
                                transition: 'background-color var(--transition-fast)'
                              }}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleTogglePermission(p.code)}
                                style={{
                                  marginTop: '3px',
                                  width: '15px',
                                  height: '15px',
                                  accentColor: 'var(--primary)',
                                  cursor: 'pointer'
                                }}
                              />
                              <div style={{ display: 'flex', flexDirection: 'column' }}>
                                <span style={{
                                  fontSize: '12.5px',
                                  fontWeight: isChecked ? '600' : '400',
                                  color: isChecked ? 'var(--primary-text)' : 'var(--text-primary)'
                                }}>
                                  {p.name}
                                </span>
                                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                                  {p.code}
                                </span>
                              </div>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* STEP 4: Access Summary */}
        {currentStep === 4 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div>
              <h4 style={{ margin: '0 0 4px 0', fontSize: '14px', color: 'var(--text-primary)', fontWeight: '600' }}>
                User Access Summary
              </h4>
              <p style={{ margin: 0, fontSize: '12.5px', color: 'var(--text-muted)' }}>
                Review which modules this user will be permitted to access versus restricted from.
              </p>
            </div>

            <div style={{
              backgroundColor: 'var(--bg-surface-secondary)',
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '12px'
            }}>
              <div>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>User</span>
                <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>
                  {formData.firstName || formData.lastName ? `${formData.firstName} ${formData.lastName}`.trim() : formData.username}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>@{formData.username}</div>
              </div>
              <div>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Assigned Role</span>
                <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--primary)' }}>
                  {selectedRoleObj?.name || 'Custom'}
                </div>
              </div>
              <div>
                <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>Total Permissions</span>
                <div style={{ fontWeight: '700', fontSize: '14px', color: 'var(--text-primary)' }}>
                  {formData.selectedPermissions.size} Granted
                </div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              {/* Access Granted */}
              <div style={{
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                backgroundColor: 'var(--bg-surface)'
              }}>
                <div style={{
                  fontWeight: '700',
                  fontSize: '13px',
                  color: 'var(--success-text)',
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  ✓ Access Granted ({accessSummary.grantedModules.length} Modules)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                  {accessSummary.grantedModules.length === 0 ? (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>No modules granted.</div>
                  ) : (
                    accessSummary.grantedModules.map((m) => (
                      <div key={m.name} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        fontSize: '12.5px',
                        padding: '4px 0',
                        borderBottom: '1px solid var(--border-subtle)'
                      }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: '500' }}>✓ {m.name}</span>
                        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{m.count}/{m.total} actions</span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* No Access */}
              <div style={{
                border: '1px solid var(--border-subtle)',
                borderRadius: 'var(--radius-md)',
                padding: '14px',
                backgroundColor: 'var(--bg-surface)'
              }}>
                <div style={{
                  fontWeight: '700',
                  fontSize: '13px',
                  color: 'var(--danger-text)',
                  marginBottom: '10px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}>
                  ✕ No Access ({accessSummary.deniedModules.length} Modules)
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', maxHeight: '200px', overflowY: 'auto' }}>
                  {accessSummary.deniedModules.length === 0 ? (
                    <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Full system access granted.</div>
                  ) : (
                    accessSummary.deniedModules.map((m) => (
                      <div key={m} style={{
                        fontSize: '12.5px',
                        color: 'var(--text-muted)',
                        padding: '4px 0',
                        borderBottom: '1px solid var(--border-subtle)'
                      }}>
                        ✕ {m}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 5: Review & Submit */}
        {currentStep === 5 && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              padding: '14px 18px',
              backgroundColor: 'var(--primary-subtle)',
              border: '1px solid var(--primary-border)',
              borderRadius: 'var(--radius-md)',
              color: 'var(--primary-text)',
              fontSize: '13px',
              lineHeight: '1.5'
            }}>
              <b>Ready to create account:</b> The user will be created with active status and assigned role <b>{selectedRoleObj?.name}</b> with <b>{formData.selectedPermissions.size}</b> active permissions.
            </div>

            <div style={{
              border: '1px solid var(--border-subtle)',
              borderRadius: 'var(--radius-md)',
              padding: '16px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px',
              fontSize: '13px'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Full Name:</span>
                <span style={{ fontWeight: '600' }}>{formData.firstName} {formData.lastName}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Username:</span>
                <span style={{ fontWeight: '600' }}>{formData.username}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Email:</span>
                <span>{formData.email || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Employee ID:</span>
                <span>{formData.employeeId || '—'}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Role:</span>
                <span style={{ color: 'var(--primary)', fontWeight: '700' }}>{selectedRoleObj?.name}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-muted)' }}>Force Password Reset:</span>
                <span>{formData.forcePasswordChange ? 'Yes (on first login)' : 'No'}</span>
              </div>
            </div>
          </div>
        )}

        {/* Stepper Footer Controls */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderTop: '1px solid var(--border-subtle)',
          paddingTop: '16px',
          marginTop: '6px'
        }}>
          {currentStep > 1 ? (
            <Button variant="secondary" onClick={prevStep} disabled={loading}>
              ← Back
            </Button>
          ) : (
            <Button variant="secondary" onClick={onClose} disabled={loading}>
              Cancel
            </Button>
          )}

          {currentStep < 5 ? (
            <Button variant="primary" onClick={nextStep}>
              Next Step →
            </Button>
          ) : (
            <Button variant="primary" onClick={handleSubmit} loading={loading}>
              Create User
            </Button>
          )}
        </div>
      </div>
    </Modal>
  );
};
