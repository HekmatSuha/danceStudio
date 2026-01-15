import React from 'react';

type WebStudio = {
  uuid: string;
  name: string;
  latitude: number;
  longitude: number;
  city?: string;
};

type WebMapProps = {
  studios?: WebStudio[];
  counts?: Record<string, number>;
  center?: [number, number];
  userLocation?: [number, number] | null;
  onMapReady?: (map: any) => void;
  onStudioSelect?: (studioId: string) => void;
};

declare const WebMap: React.FC<WebMapProps>;
export default WebMap;
