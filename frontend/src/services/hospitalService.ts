import { User } from './authService';

export interface DiseaseServer {
  id: number;
  name: string;
  type: 'IMAGE' | 'TABULAR' | 'AUDIO';
  algorithm: 'FedAvg' | 'FedProx';
  status: 'ACTIVE' | 'INACTIVE';
  hospitalsCount: number;
  description: string;
}

export interface HospitalDataset {
  id: number;
  name: string;
  type: 'IMAGE' | 'TABULAR' | 'AUDIO';
  size: string;
  count: number;
  uploadedAt: string;
  status: 'PROCESSED' | 'PROCESSING' | 'FAILED';
}

export interface TrainingLog {
  id: number;
  timestamp: string;
  round: number;
  accuracy: number;
  loss: number;
  message: string;
}

const mockServers: DiseaseServer[] = [
  { id: 1, name: 'Pneumonia Detect-AI', type: 'IMAGE', algorithm: 'FedAvg', status: 'ACTIVE', hospitalsCount: 12, description: 'Federated CNN model for detecting pneumonia from chest X-rays.' },
  { id: 2, name: 'Diabetes Risk Predictor', type: 'TABULAR', algorithm: 'FedProx', status: 'ACTIVE', hospitalsCount: 8, description: 'XGBoost model for predicting diabetes based on patient records.' },
  { id: 3, name: 'Cardiac Arrhythmia Audio', type: 'AUDIO', algorithm: 'FedAvg', status: 'INACTIVE', hospitalsCount: 0, description: 'Detecting irregularities in heart sounds using spectrogram CNNs.' },
  { id: 4, name: 'Brain Tumor Segmentation', type: 'IMAGE', algorithm: 'FedProx', status: 'ACTIVE', hospitalsCount: 5, description: 'Advanced U-Net for MRI brain tumor analysis.' },
];

const mockDatasets: HospitalDataset[] = [
  { id: 1, name: 'Local X-Ray Set A', type: 'IMAGE', size: '2.4 GB', count: 1200, uploadedAt: '2026-03-28', status: 'PROCESSED' },
  { id: 2, name: 'Patient Tabular Records', type: 'TABULAR', size: '45 MB', count: 5000, uploadedAt: '2026-04-02', status: 'PROCESSED' },
];

const hospitalService = {
  getServers: async (): Promise<DiseaseServer[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockServers), 800);
    });
  },

  getDatasets: async (): Promise<HospitalDataset[]> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(mockDatasets), 600);
    });
  },

  joinServer: async (serverId: number): Promise<boolean> => {
    return new Promise((resolve) => {
      setTimeout(() => resolve(true), 1500);
    });
  },

  uploadDataset: async (data: any, onProgress: (progress: number) => void): Promise<HospitalDataset> => {
    return new Promise((resolve) => {
      let progress = 0;
      const interval = setInterval(() => {
        progress += 10;
        onProgress(progress);
        if (progress >= 100) {
          clearInterval(interval);
          resolve({
            id: Math.floor(Math.random() * 1000),
            name: data.name,
            type: data.type,
            size: '1.2 GB',
            count: 500,
            uploadedAt: new Date().toISOString().split('T')[0],
            status: 'PROCESSED',
          });
        }
      }, 300);
    });
  },

  getTrainingLogs: (callback: (log: TrainingLog) => void) => {
    let round = 1;
    const interval = setInterval(() => {
      const log: TrainingLog = {
        id: Date.now(),
        timestamp: new Date().toLocaleTimeString(),
        round: round,
        accuracy: 0.85 + Math.random() * 0.1,
        loss: 0.15 - Math.random() * 0.05,
        message: `Round ${round}: Weights aggregated successfully from 5 hospitals.`,
      };
      callback(log);
      round++;
      if (round > 10) clearInterval(interval);
    }, 2000);
    return () => clearInterval(interval);
  }
};

export default hospitalService;
