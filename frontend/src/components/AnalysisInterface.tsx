import React, { useState, useEffect } from 'react';
import { PoopRecord, Pet } from '../../../shared/types';
import { AnalysisResult } from './AnalysisResult';
import { HealthVisualization } from './HealthVisualization';
import { AnalysisService } from '../services/analysisService';
import { 
  Save, 
  Share2, 
  Download, 
  Edit3, 
  Trash2,
  TrendingUp,
  Calendar,
  AlertCircle,
  CheckCircle,
  Clock,
  BookmarkPlus,
  Heart,
  MessageSquare,
  BarChart3,
  FileText,
  Camera,
  Lightbulb
} from 'lucide-react';

interface AnalysisInterfaceProps {
  record: PoopRecord;
  pet: Pet;
  isNew?: boolean;
  onSave?: (record: PoopRecord) => void;
  onEdit?: (record: PoopRecord) => void;
  onDelete?: (recordId: string) => void;
  onRetakePhoto?: () => 