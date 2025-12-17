'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ArrowRight, Plus, Edit, Trash2, MapPin, Search } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface Location {
  id: string;
  governorate: string;
  area: string;
  created_at: string;
}

export default function AdminLocationsPage() {
  const router = useRouter();
  const { user, isLoading: authLoading, isAuthenticated } = useAuth();
  const [locations, setLocations] = useState<Location[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<Location | null>(null);
  const [formData, setFormData] = useState({
    governorate: '',
    area: ''
  });

  useEffect(() => {
    if (!authLoading && (!isAuthenticated || !user || user.role !== 'admin')) {
      router.push('/dashboard/admin');
      return;
    }
    
    if (isAuthenticated && user && user.role === 'admin') {
      loadLocations();
    }
  }, [authLoading, isAuthenticated, user]);

  const loadLocations = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/locations');
      const result = await response.json();
      
      if (result.success && result.data) {
        setLocations(result.data);
      }
    } catch (error) {
      console.error('Error loading locations:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingLocation 
        ? `/api/locations/${editingLocation.id}`
        : '/api/locations';
      
      const method = editingLocation ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        await loadLocations();
        setShowAddModal(false);
        setEditingLocation(null);
        setFormData({ governorate: '', area: '' });
        alert(editingLocation ? 'تم تحديث الموقع بنجاح!' : 'تم إضافة الموقع بنجاح!');
      } else {
        alert('حدث خطأ في العملية');
      }
    } catch (error) {
      console.error('Error saving location:', error);
      alert('حدث خطأ في العملية');
    }
  };

  const handleEdit = (location: Location) => {
    setEditingLocation(location);
    setFormData({
      governorate: location.governorate,
      area: location.area
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الموقع؟')) {
      try {
        const response = await fetch(`/api/locations/${id}`, {
          method: 'DELETE'
        });

        if (response.ok) {
          await loadLocations();
          alert('تم حذف الموقع بنجاح!');
        } else {
          const result = await response.json();
          alert(result.error || 'حدث خطأ في حذف الموقع');
        }
      } catch (error) {
        console.error('Error deleting location:', error);
        alert('حدث خطأ في حذف الموقع');
      }
    }
  };

  const filteredLocations = locations.filter(location =>
    location.governorate.toLowerCase().includes(searchTerm.toLowerCase()) ||
    location.area.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // تجميع المواقع حسب المحافظة
  const locationsByGovernorate = filteredLocations.reduce((acc, location) => {
    if (!acc[location.governorate]) {
      acc[location.governorate] = [];
    }
    acc[location.governorate].push(location);
    return acc;
  }, {} as Record<string, Location[]>);

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">جاري التحميل...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !user || user.role !== 'admin') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Card className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-gray-900 mb-2">صلاحيات إدارية مطلوبة</h2>
            <p className="text-gray-600 mb-6">يجب تسجيل الدخول كمدير للوصول إلى هذه الصفحة</p>
            <Button 
              onClick={() => router.push('/dashboard/admin')}
              className="w-full bg-blue-600 hover:bg-blue-700"
            >
              العودة للوحة الإدارة
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                onClick={() => router.back()}
                variant="ghost"
                className="flex items-center gap-2"
              >
                <ArrowRight className="h-4 w-4" />
                العودة
              </Button>
              
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">إدارة المواقع</h1>
                  <p className="text-sm text-gray-600">إضافة وتعديل وحذف المحافظات والمناطق</p>
                </div>
              </div>
            </div>

            <Button
              onClick={() => {
                setEditingLocation(null);
                setFormData({ governorate: '', area: '' });
                setShowAddModal(true);
              }}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              إضافة موقع جديد
            </Button>
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search */}
        <Card className="bg-white rounded-lg shadow-sm mb-6">
          <CardContent className="p-6">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                type="text"
                placeholder="البحث في المواقع..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-4 pr-12 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </CardContent>
        </Card>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="bg-white rounded-lg shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">إجمالي المواقع</p>
                  <p className="text-2xl font-bold text-gray-900">{locations.length}</p>
                </div>
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-lg shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">المحافظات</p>
                  <p className="text-2xl font-bold text-gray-900">{Object.keys(locationsByGovernorate).length}</p>
                </div>
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                  <MapPin className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-white rounded-lg shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-600">نتائج البحث</p>
                  <p className="text-2xl font-bold text-gray-900">{filteredLocations.length}</p>
                </div>
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
                  <Search className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Locations by Governorate */}
        <div className="space-y-6">
          {Object.keys(locationsByGovernorate).length === 0 ? (
            <Card className="bg-white rounded-lg shadow-sm">
              <CardContent className="p-12 text-center">
                <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">لا توجد مواقع</p>
              </CardContent>
            </Card>
          ) : (
            Object.entries(locationsByGovernorate).map(([governorate, govLocations]) => (
              <Card key={governorate} className="bg-white rounded-lg shadow-sm">
                <CardContent className="p-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    {governorate} ({govLocations.length} منطقة)
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {govLocations.map(location => (
                      <div key={location.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-gray-900">{location.area}</h4>
                            <p className="text-xs text-gray-500">
                              {new Date(location.created_at).toLocaleDateString('ar-SA')}
                            </p>
                          </div>
                          
                          <div className="flex items-center gap-1">
                            <Button
                              onClick={() => handleEdit(location)}
                              size="sm"
                              variant="ghost"
                              className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            
                            <Button
                              onClick={() => handleDelete(location.id)}
                              size="sm"
                              variant="ghost"
                              className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">
                  {editingLocation ? 'تعديل الموقع' : 'إضافة موقع جديد'}
                </h3>
                <button 
                  onClick={() => {
                    setShowAddModal(false);
                    setEditingLocation(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المحافظة
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.governorate}
                    onChange={(e) => setFormData({ ...formData, governorate: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="مثال: الرياض"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    المنطقة
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.area}
                    onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="مثال: الملز"
                  />
                </div>
                
                <div className="flex gap-3 pt-4">
                  <Button 
                    type="submit"
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {editingLocation ? 'تحديث' : 'إضافة'}
                  </Button>
                  <Button 
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingLocation(null);
                    }}
                    variant="outline" 
                    className="flex-1"
                  >
                    إلغاء
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}