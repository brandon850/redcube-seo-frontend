import { toast, apiFetch, relativeTime, openModal, closeModal } from '/js/utils.js';

export async function loadTeam() {
  const res=await apiFetch('/admin/team'); if(!res) return;
  const members=(await res.json()).members||[];
  const tbody=document.getElementById('team-tbody');
  if (!members.length) { tbody.innerHTML=`<tr><td colspan="5" style="text-align:center;padding:2rem;color:var(--g2);font-size:.72rem;text-transform:uppercase;letter-spacing:.06em">No team members yet</td></tr>`; return; }
  tbody.innerHTML=members.map(m=>`<tr><td style="font-weight:600;color:var(--white)">${m.name||'—'}</td><td style="color:var(--g4)">${m.email}</td><td><span class="tag">${m.role}</span></td><td style="color:var(--g4)">${relativeTime(m.last_login)}</td><td><button class="action-btn danger" onclick="removeMember('${m.id}')">Remove</button></td></tr>`).join('');
}

export function openInviteModal() { openModal('modal-invite'); }

export async function inviteMember() {
  const name=document.getElementById('invite-name').value.trim();
  const email=document.getElementById('invite-email').value.trim();
  const role=document.getElementById('invite-role').value;
  if (!email) { toast('Please enter an email address'); return; }
  const res=await apiFetch('/admin/team/invite',{method:'POST',body:JSON.stringify({name,email,role})});
  if (!res||!res.ok) { toast('Failed to send invite'); return; }
  closeModal('modal-invite'); toast('Invite sent to '+email); loadTeam();
}

export async function removeMember(memberId) {
  if (!confirm('Remove this team member?')) return;
  await apiFetch('/admin/team/'+memberId,{method:'DELETE'});
  loadTeam(); toast('Member removed');
}

window.loadTeam=loadTeam; window.openInviteModal=openInviteModal; window.inviteMember=inviteMember; window.removeMember=removeMember;
