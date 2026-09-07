import DashboardLayout from './(dashboard)/layout';
import DashboardOverview from './(dashboard)/page';

export default function RootPage() {
  return (
    <DashboardLayout>
      <DashboardOverview />
    </DashboardLayout>
  );
}