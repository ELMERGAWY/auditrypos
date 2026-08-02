import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  BarChart3, TrendingUp, DollarSign, Eye, MousePointerClick,
  Calendar, Filter, Download, RefreshCw, Facebook, Instagram,
  ArrowUp, ArrowDown, Target, Zap, PieChart
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart as RechartsPieChart, Pie, Cell } from 'recharts';

interface AdPerformance {
  id: string;
  metric_date: string;
  impressions: number;
  reach: number;
  clicks: number;
  click_through_rate: number;
  engagements: number;
  engagement_rate: number;
  conversions: number;
  conversion_rate: number;
  spend: number;
  cost_per_click: number;
  cost_per_conversion: number;
  cost_per_thousand_impressions: number;
  revenue: number;
  return_on_ad_spend: number;
  campaign_id?: string;
  campaign_name?: string;
  platform: string;
}

interface Props {
  restaurantId: string;
  currency: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];

export function AdAnalyticsDashboard({ restaurantId, currency }: Props) {
  const [adPerformance, setAdPerformance] = useState<AdPerformance[]>([]);
  const [loading, setLoading] = useState(false);
  const [dateRange, setDateRange] = useState('30');
  const [selectedPlatform, setSelectedPlatform] = useState('all');
  const [selectedCampaign, setSelectedCampaign] = useState('all');

  const loadAdPerformance = async () => {
    setLoading(true);
    try {
      const days = parseInt(dateRange);
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('marketing_ad_performance')
        .select('*')
        .eq('restaurant_id', restaurantId)
        .gte('metric_date', startDate.toISOString().split('T')[0])
        .order('metric_date', { ascending: false });

      if (error) throw error;

      setAdPerformance(data || []);
    } catch (error: any) {
      toast.error('فشل تحليل البيانات: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadAdPerformance(); }, [restaurantId, dateRange]);

  const filteredData = adPerformance.filter(perf => {
    const matchesPlatform = selectedPlatform === 'all' || perf.platform === selectedPlatform;
    const matchesCampaign = selectedCampaign === 'all' || perf.campaign_id === selectedCampaign;
    return matchesPlatform && matchesCampaign;
  });

  const campaigns = Array.from(new Set(filteredData.map(d => d.campaign_id).filter(Boolean)));

  const stats = {
    totalSpend: filteredData.reduce((sum, d) => sum + d.spend, 0),
    totalImpressions: filteredData.reduce((sum, d) => sum + d.impressions, 0),
    totalClicks: filteredData.reduce((sum, d) => sum + d.clicks, 0),
    totalConversions: filteredData.reduce((sum, d) => sum + d.conversions, 0),
    totalRevenue: filteredData.reduce((sum, d) => sum + d.revenue, 0),
    avgCTR: filteredData.length > 0 ? filteredData.reduce((sum, d) => sum + d.click_through_rate, 0) / filteredData.length : 0,
    avgROAS: filteredData.length > 0 ? filteredData.reduce((sum, d) => sum + d.return_on_ad_spend, 0) / filteredData.length : 0,
  };

  const chartData = filteredData.slice(0, 30).reverse().map(d => ({
    date: new Date(d.metric_date).toLocaleDateString('ar-EG', { month: 'short', day: 'numeric' }),
    spend: d.spend,
    clicks: d.clicks,
    conversions: d.conversions,
    roas: d.return_on_ad_spend,
  }));

  const platformData = filteredData.reduce((acc, d) => {
    acc[d.platform] = (acc[d.platform] || 0) + d.spend;
    return acc;
  }, {} as Record<string, number>);

  const platformChartData = Object.entries(platformData).map(([name, value]) => ({ name, value }));

  const exportReport = () => {
    const csv = [
      ['Date', 'Platform', 'Campaign', 'Impressions', 'Clicks', 'CTR', 'Conversions', 'Spend', 'ROAS'].join(','),
      ...filteredData.map(d => [
        d.metric_date,
        d.platform,
        d.campaign_name || '',
        d.impressions,
        d.clicks,
        d.click_through_rate.toFixed(2),
        d.conversions,
        d.spend,
        d.return_on_ad_spend.toFixed(2)
      ].join(','))
    ].join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ad_analytics_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    toast.success('تم تصدير التقرير');
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-500/20 rounded-xl">
            <BarChart3 className="w-8 h-8 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">تحليلات الإعلانات</h1>
            <p className="text-muted-foreground">تحليل شامل لأداء الحملات الإعلانية</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={loadAdPerformance} disabled={loading}>
            <RefreshCw className={`w-4 h-4 ml-2 ${loading ? 'animate-spin' : ''}`} />
            تحديث
          </Button>
          <Button variant="outline" onClick={exportReport} disabled={!filteredData.length}>
            <Download className="w-4 h-4 ml-2" />
            تصدير
          </Button>
        </div>
      </div>

      {/* Filters */}
      <Card className="p-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <Label>الفترة الزمنية</Label>
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">آخر 7 أيام</SelectItem>
                <SelectItem value="30">آخر 30 يوم</SelectItem>
                <SelectItem value="90">آخر 90 يوم</SelectItem>
                <SelectItem value="365">آخر سنة</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1">
            <Label>المنصة</Label>
            <Select value={selectedPlatform} onValueChange={setSelectedPlatform}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">جميع المنصات</SelectItem>
                <SelectItem value="facebook">فيسبوك</SelectItem>
                <SelectItem value="instagram">إنستغرام</SelectItem>
                <SelectItem value="google">جوجل</SelectItem>
                <SelectItem value="tiktok">تيك توك</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {campaigns.length > 0 && (
            <div className="flex-1">
              <Label>الحملة</Label>
              <Select value={selectedCampaign} onValueChange={setSelectedCampaign}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">جميع الحملات</SelectItem>
                  {campaigns.map(campaign => (
                    <SelectItem key={campaign} value={campaign}>{campaign}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </Card>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-8 gap-4">
        <Card className="p-4 bg-blue-500/10 border-blue-500/20">
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-blue-400" />
            <div>
              <p className="text-xs text-muted-foreground">إجمالي الإنفاق</p>
              <p className="font-bold">{stats.totalSpend.toLocaleString()} {currency}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-purple-500/10 border-purple-500/20">
          <div className="flex items-center gap-2">
            <Eye className="w-4 h-4 text-purple-400" />
            <div>
              <p className="text-xs text-muted-foreground">الظهور</p>
              <p className="font-bold">{stats.totalImpressions.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-green-500/10 border-green-500/20">
          <div className="flex items-center gap-2">
            <MousePointerClick className="w-4 h-4 text-green-400" />
            <div>
              <p className="text-xs text-muted-foreground">النقرات</p>
              <p className="font-bold">{stats.totalClicks.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-amber-500/10 border-amber-500/20">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-amber-400" />
            <div>
              <p className="text-xs text-muted-foreground">التحويلات</p>
              <p className="font-bold">{stats.totalConversions.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-indigo-500/10 border-indigo-500/20">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-indigo-400" />
            <div>
              <p className="text-xs text-muted-foreground">CTR</p>
              <p className="font-bold">{stats.avgCTR.toFixed(2)}%</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-emerald-500/10 border-emerald-500/20">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400" />
            <div>
              <p className="text-xs text-muted-foreground">ROAS</p>
              <p className="font-bold">{stats.avgROAS.toFixed(2)}x</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-rose-500/10 border-rose-500/20">
          <div className="flex items-center gap-2">
            <ArrowUp className="w-4 h-4 text-rose-400" />
            <div>
              <p className="text-xs text-muted-foreground">الإيرادات</p>
              <p className="font-bold">{stats.totalRevenue.toLocaleString()} {currency}</p>
            </div>
          </div>
        </Card>
        <Card className="p-4 bg-cyan-500/10 border-cyan-500/20">
          <div className="flex items-center gap-2">
            <PieChart className="w-4 h-4 text-cyan-400" />
            <div>
              <p className="text-xs text-muted-foreground">الربح</p>
              <p className="font-bold">{(stats.totalRevenue - stats.totalSpend).toLocaleString()} {currency}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Performance Over Time */}
        <Card className="p-6">
          <h3 className="font-bold mb-4">الأداء عبر الزمن</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} />
                <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
                <Line type="monotone" dataKey="spend" stroke="#8884d8" strokeWidth={2} name="الإنفاق" />
                <Line type="monotone" dataKey="clicks" stroke="#82ca9d" strokeWidth={2} name="النقرات" />
                <Line type="monotone" dataKey="conversions" stroke="#ffc658" strokeWidth={2} name="التحويلات" />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        {/* Platform Distribution */}
        <Card className="p-6">
          <h3 className="font-bold mb-4">توزيع الإنفاق حسب المنصة</h3>
          <div className="h-80">
            <ResponsiveContainer width="100%" height="100%">
              <RechartsPieChart>
                <Pie
                  data={platformChartData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {platformChartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </RechartsPieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* ROAS Chart */}
      <Card className="p-6">
        <h3 className="font-bold mb-4">ROAS عبر الزمن</h3>
        <div className="h-80">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)" />
              <XAxis dataKey="date" fontSize={12} />
              <YAxis fontSize={12} />
              <Tooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }} />
              <Bar dataKey="roas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="ROAS" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* Detailed Data Table */}
      <Card className="p-6">
        <h3 className="font-bold mb-4">البيانات التفصيلية</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b">
                <th className="text-right p-3 text-sm font-medium">التاريخ</th>
                <th className="text-right p-3 text-sm font-medium">المنصة</th>
                <th className="text-right p-3 text-sm font-medium">الحملة</th>
                <th className="text-right p-3 text-sm font-medium">الظهور</th>
                <th className="text-right p-3 text-sm font-medium">النقرات</th>
                <th className="text-right p-3 text-sm font-medium">CTR</th>
                <th className="text-right p-3 text-sm font-medium">التحويلات</th>
                <th className="text-right p-3 text-sm font-medium">الإنفاق</th>
                <th className="text-right p-3 text-sm font-medium">ROAS</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.slice(0, 20).map((perf, index) => (
                <tr key={index} className="border-b hover:bg-muted/50">
                  <td className="p-3 text-sm">{new Date(perf.metric_date).toLocaleDateString('ar-EG')}</td>
                  <td className="p-3 text-sm">
                    <Badge variant="outline" className="text-xs">
                      {perf.platform === 'facebook' && <Facebook className="w-3 h-3 inline mr-1" />}
                      {perf.platform === 'instagram' && <Instagram className="w-3 h-3 inline mr-1" />}
                      {perf.platform}
                    </Badge>
                  </td>
                  <td className="p-3 text-sm">{perf.campaign_name || '-'}</td>
                  <td className="p-3 text-sm">{perf.impressions.toLocaleString()}</td>
                  <td className="p-3 text-sm">{perf.clicks.toLocaleString()}</td>
                  <td className="p-3 text-sm">{perf.click_through_rate.toFixed(2)}%</td>
                  <td className="p-3 text-sm">{perf.conversions.toLocaleString()}</td>
                  <td className="p-3 text-sm font-medium">{perf.spend.toLocaleString()} {currency}</td>
                  <td className="p-3 text-sm">
                    <span className={perf.return_on_ad_spend >= 1 ? 'text-green-400' : 'text-red-400'}>
                      {perf.return_on_ad_spend.toFixed(2)}x
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filteredData.length > 20 && (
          <p className="text-center text-sm text-muted-foreground mt-4">
            عرض أول 20 سجل من {filteredData.length}
          </p>
        )}
      </Card>
    </div>
  );
}
