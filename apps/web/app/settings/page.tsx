import { permanentRedirect } from 'next/navigation';

export default function SettingsPage() {
  permanentRedirect('/settings/timesheet-statuses');
}
