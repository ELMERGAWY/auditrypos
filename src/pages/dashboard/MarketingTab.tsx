import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FolderKanban, Users, FileText, DollarSign, Facebook,
  BarChart3, Shield, Building2
} from 'lucide-react';
import { ProjectsManager } from '@/components/marketing/ProjectsManager';
import { CRMManager } from '@/components/marketing/CRMManager';
import { RetainersManager } from '@/components/marketing/RetainersManager';
import { ExpensesManager } from '@/components/marketing/ExpensesManager';
import { SocialMediaManager } from '@/pages/dashboard/SocialMediaManager';
import { AdAnalyticsDashboard } from '@/components/marketing/AdAnalyticsDashboard';
import { AgencyEmployeesManager } from '@/components/marketing/AgencyEmployeesManager';

interface Props {
  restaurantId: string;
  currency: string;
}

export function MarketingTab({ restaurantId, currency }: Props) {
  const [activeTab, setActiveTab] = useState('projects');

  return (
    <div className="h-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
        <TabsList className="grid grid-cols-4 lg:grid-cols-7 w-full mb-6">
          <TabsTrigger value="projects" className="gap-2">
            <FolderKanban className="w-4 h-4" />
            <span className="hidden sm:inline">المشاريع</span>
          </TabsTrigger>
          <TabsTrigger value="crm" className="gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">CRM</span>
          </TabsTrigger>
          <TabsTrigger value="retainers" className="gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">العقود</span>
          </TabsTrigger>
          <TabsTrigger value="expenses" className="gap-2">
            <DollarSign className="w-4 h-4" />
            <span className="hidden sm:inline">المصروفات</span>
          </TabsTrigger>
          <TabsTrigger value="facebook" className="gap-2">
            <Facebook className="w-4 h-4" />
            <span className="hidden sm:inline">فيسبوك</span>
          </TabsTrigger>
          <TabsTrigger value="analytics" className="gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">التحليلات</span>
          </TabsTrigger>
          <TabsTrigger value="employees" className="gap-2">
            <Shield className="w-4 h-4" />
            <span className="hidden sm:inline">الموظفين</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="projects" className="mt-0">
          <ProjectsManager restaurantId={restaurantId} currency={currency} />
        </TabsContent>

        <TabsContent value="crm" className="mt-0">
          <CRMManager restaurantId={restaurantId} currency={currency} />
        </TabsContent>

        <TabsContent value="retainers" className="mt-0">
          <RetainersManager restaurantId={restaurantId} currency={currency} />
        </TabsContent>

        <TabsContent value="expenses" className="mt-0">
          <ExpensesManager restaurantId={restaurantId} currency={currency} />
        </TabsContent>

        <TabsContent value="facebook" className="mt-0">
          <SocialMediaManager restaurantId={restaurantId} />
        </TabsContent>

        <TabsContent value="analytics" className="mt-0">
          <AdAnalyticsDashboard restaurantId={restaurantId} currency={currency} />
        </TabsContent>

        <TabsContent value="employees" className="mt-0">
          <AgencyEmployeesManager restaurantId={restaurantId} currency={currency} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
