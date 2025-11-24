import React, { useState } from 'react';
import { 
  Calendar, 
  Filter, 
  Search, 
  Eye, 
  Edit, 
  Trash2, 
  Share2,
  AlertTriangle,
  CheckCircle,
  AlertCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { HealthRecord, RecordFilters } from '../services/recordsService';
import { useI18n } from '../i18n/I18nProvider';

interface RecordsListProps {
  records: HealthRecord[];
  pagination: any;
  filters: RecordFilters;
  loading: boolean;
  onFiltersChange: (filters: Partial<RecordFilters>) => void;
  onViewRecord: (record: HealthRecord) => void;
  onEditRecord: (record: HealthRecord) => void;
  onDeleteRecord: (record: HealthRecord) => void;
  onBatchDelete?: (recordIds: string[]) => void;
}

const RecordsList: React.FC<RecordsListProps> = ({
  records,
  pagination,
  filters,
  loading,
  onFiltersChange,
  onViewRecord,
  onEditRecord,
  onDeleteRecord,
  onBatchDelete
}) => {
  const [selectedRecords, setSelectedRecords] = useState<string[]>([]);
  const [showFilters, setShowFilters] = useState(false);
  const [searchTerm, setSearchTerm] = useState(filters.search || '');
  const { t, language } = useI18n();

  const handleSelectRecord = (recordId: string) => {
    setSelectedRecords(prev => 
      prev.includes(recordId) 
        ? prev.filter(id => id !== recordId)
        : [...prev, recordId]
    );
  };

  const handleSelectAll = () => {
    if (selectedRecords.length === records.length) {
      setSelectedRecords([]);
    } else {
      setSelectedRecords(records.map(record => record.id));
    }
  };

  const handleBatchDelete = () => {
    if (selectedRecords.length > 0 && onBatchDelete) {
      onBatchDelete(selectedRecords);
      setSelectedRecords([]);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    onFiltersChange({ search: searchTerm, page: 1 });
  };

  const handlePageChange = (page: number) => {
    onFiltersChange({ page });
  };

  const getHealthStatusIcon = (status: string) => {
    switch (status) {
      case 'healthy':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'warning':
        return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
      case 'concerning':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <AlertCircle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getHealthStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800';
      case 'warning':
        return 'bg-yellow-100 text-yellow-800';
      case 'concerning':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (dateString: string) => {
    const locale = language === 'zh' ? t('analysis.dateLocale_zh') : t('analysis.dateLocale_en');
    return new Date(dateString).toLocaleString(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Header toolbar */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          {/* Search box */}
          <form onSubmit={handleSearch} className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder={t('recordsList.toolbar.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
              />
            </div>
          </form>

          {/* Tools */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              <Filter className="w-4 h-4" />
              {t('recordsList.toolbar.filter')}
            </button>

            {selectedRecords.length > 0 && (
              <button
                onClick={handleBatchDelete}
                className="flex items-center gap-2 px-3 py-2 text-red-600 hover:text-red-800 border border-red-300 rounded-lg hover:bg-red-50"
              >
                <Trash2 className="w-4 h-4" />
                {t('recordsList.toolbar.deleteSelected', { count: selectedRecords.length })}
              </button>
            )}
          </div>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Health status filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('recordsList.filters.healthStatus')}
                </label>
                <select
                  value={filters.healthStatus || ''}
                  onChange={(e) => onFiltersChange({ healthStatus: e.target.value as any, page: 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                >
                  <option value="">{t('recordsList.filters.all')}</option>
                  <option value="healthy">{t('status.healthy')}</option>
                  <option value="warning">{t('status.warning')}</option>
                  <option value="concerning">{t('status.concerning')}</option>
                </select>
              </div>

              {/* Date range */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('recordsList.filters.startDate')}
                </label>
                <input
                  type="date"
                  value={filters.startDate || ''}
                  onChange={(e) => onFiltersChange({ startDate: e.target.value, page: 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t('recordsList.filters.endDate')}
                </label>
                <input
                  type="date"
                  value={filters.endDate || ''}
                  onChange={(e) => onFiltersChange({ endDate: e.target.value, page: 1 })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  onFiltersChange({ 
                    healthStatus: undefined, 
                    startDate: undefined, 
                    endDate: undefined, 
                    search: undefined,
                    page: 1 
                  });
                  setSearchTerm('');
                }}
                className="px-4 py-2 text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                {t('recordsList.filters.clear')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Records table */}
      <div className="overflow-x-auto">
        {loading ? (
          <div className="p-8 text-center">
            <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-orange-500"></div>
            <p className="mt-2 text-gray-600">{t('recordsList.loading')}</p>
          </div>
        ) : records.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Calendar className="w-12 h-12 mx-auto mb-4 text-gray-300" />
            <p>{t('recordsList.empty')}</p>
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedRecords.length === records.length && records.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('recordsList.columns.pet')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('recordsList.columns.healthStatus')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('recordsList.columns.confidence')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('recordsList.columns.time')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('recordsList.columns.notes')}
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {t('recordsList.columns.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {records.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50">
                  <td className="px-4 py-4">
                    <input
                      type="checkbox"
                      checked={selectedRecords.includes(record.id)}
                      onChange={() => handleSelectRecord(record.id)}
                      className="rounded border-gray-300 text-orange-600 focus:ring-orange-500"
                    />
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center">
                      {record.pet.avatar ? (
                        <img
                          src={record.pet.avatar}
                          alt={record.pet.name}
                          className="w-8 h-8 rounded-full mr-3"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gray-200 rounded-full mr-3 flex items-center justify-center">
                          <span className="text-xs text-gray-500">
                            {record.pet.name.charAt(0)}
                          </span>
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {record.pet.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {record.pet.breed || record.pet.type}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center">
                      {getHealthStatusIcon(record.analysis.healthStatus)}
                      <span className={`ml-2 px-2 py-1 text-xs font-medium rounded-full ${getHealthStatusColor(record.analysis.healthStatus)}`}>
                        {t(`status.${record.analysis.healthStatus}`)}
                      </span>
                    </div>
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900">
                    {record.analysis.confidence}%
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-900">
                    {formatDate(record.timestamp)}
                  </td>
                  <td className="px-4 py-4 text-sm text-gray-500 max-w-xs truncate">
                    {record.userNotes || '-'}
                  </td>
                  <td className="px-4 py-4">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => onViewRecord(record)}
                        className="text-blue-600 hover:text-blue-800"
                        title={t('recordsList.actions.view')}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onEditRecord(record)}
                        className="text-green-600 hover:text-green-800"
                        title={t('recordsList.actions.edit')}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteRecord(record)}
                        className="text-red-600 hover:text-red-800"
                        title={t('recordsList.actions.delete')}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      {record.isShared && (
                        <Share2 className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {pagination && pagination.totalPages > 1 && (
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
          <div className="text-sm text-gray-700">
            {t('recordsList.pagination.range', {
              from: ((pagination.page - 1) * pagination.limit) + 1,
              to: Math.min(pagination.page * pagination.limit, pagination.total),
              total: pagination.total
            })}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={!pagination.hasPrev}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronLeft className="w-4 h-4" />
              {t('recordsList.pagination.prev')}
            </button>
            
            <span className="px-3 py-2 text-sm text-gray-700">
              {t('recordsList.pagination.pageOf', { page: pagination.page, totalPages: pagination.totalPages })}
            </span>
            
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={!pagination.hasNext}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {t('recordsList.pagination.next')}
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default RecordsList;