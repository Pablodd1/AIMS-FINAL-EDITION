/**
 * RPM (Remote Patient Monitoring) Device Connection Utilities
 * Supports: Web Bluetooth, USB Serial, Manual Entry
 */

// Standard Bluetooth Low Energy service UUIDs for health devices
export const BLE_SERVICES = {
  BLOOD_PRESSURE: {
    SERVICE: '00001810-0000-1000-8000-00805f9b34fb',
    MEASUREMENT: '00002a35-0000-1000-8000-00805f9b34fb',
    FEATURE: '00002a49-0000-1000-8000-00805f9b34fb'
  },
  GLUCOSE: {
    SERVICE: '00001808-0000-1000-8000-00805f9b34fb',
    MEASUREMENT: '00002a18-0000-1000-8000-00805f9b34fb',
    CONTEXT: '00002a34-0000-1000-8000-00805f9b34fb'
  },
  DEVICE_INFO: {
    SERVICE: '0000180a-0000-1000-8000-00805f9b34fb',
    MANUFACTURER: '00002a29-0000-1000-8000-00805f9b34fb',
    MODEL_NUMBER: '00002a24-0000-1000-8000-00805f9b34fb'
  }
};

/**
 * Check if Bluetooth is available in the current browser
 * @returns true if Bluetooth is supported, false otherwise
 */
export const isBluetoothAvailable = (): boolean => {
  return typeof navigator !== 'undefined' && 'bluetooth' in navigator;
};

/**
 * Request a Bluetooth device with specific filters
 * @param services Array of service UUIDs to filter by
 * @param acceptAllDevices Whether to accept all devices
 * @returns BluetoothDevice or null if request failed
 */
export const requestDevice = async (
  services: string[] = [],
  acceptAllDevices: boolean = false
): Promise<BluetoothDevice | null> => {
  try {
    const options: RequestDeviceOptions = acceptAllDevices
      ? {
          acceptAllDevices: true,
          optionalServices: [
            BLE_SERVICES.BLOOD_PRESSURE.SERVICE,
            BLE_SERVICES.GLUCOSE.SERVICE,
            BLE_SERVICES.DEVICE_INFO.SERVICE,
            '00001800-0000-1000-8000-00805f9b34fb', // Generic Access
            '00001801-0000-1000-8000-00805f9b34fb', // Generic Attribute
            '0000180f-0000-1000-8000-00805f9b34fb', // Battery Service
            '0000180d-0000-1000-8000-00805f9b34fb', // Heart Rate Service
          ]
        }
      : {
          filters: services.map(service => ({ services: [service] })),
          optionalServices: [
            BLE_SERVICES.BLOOD_PRESSURE.SERVICE,
            BLE_SERVICES.GLUCOSE.SERVICE,
            BLE_SERVICES.DEVICE_INFO.SERVICE
          ]
        };

    const device = await navigator.bluetooth.requestDevice(options);
    return device;
  } catch (error) {
    console.error("Error requesting Bluetooth device:", error);
    return null;
  }
};

/**
 * Connect to a blood pressure monitor
 * @returns BluetoothDevice or null if connection failed
 */
export const connectBloodPressureMonitor = async (): Promise<BluetoothDevice | null> => {
  try {
    // Most permissive approach possible to find blood pressure devices
    const options: RequestDeviceOptions = {
      acceptAllDevices: true,
      optionalServices: [
        BLE_SERVICES.BLOOD_PRESSURE.SERVICE,
        BLE_SERVICES.DEVICE_INFO.SERVICE,
        '00001800-0000-1000-8000-00805f9b34fb', // Generic Access
        '00001801-0000-1000-8000-00805f9b34fb', // Generic Attribute
        '00002a1c-0000-1000-8000-00805f9b34fb', // Temperature Measurement
        '00001809-0000-1000-8000-00805f9b34fb', // Health Thermometer
        '0000180f-0000-1000-8000-00805f9b34fb', // Battery Service
        '0000180d-0000-1000-8000-00805f9b34fb', // Heart Rate Service
        '00002a37-0000-1000-8000-00805f9b34fb', // Heart Rate Measurement
      ]
    };
    
    console.log("Opening Bluetooth device selection dialog with settings:", options);
    
    const device = await navigator.bluetooth.requestDevice(options);
    console.log("Device selected:", device.name, device.id);
    return device;
  } catch (error) {
    console.error("Error connecting to blood pressure monitor:", error);
    return null;
  }
};

/**
 * Connect to a glucose meter
 * @returns BluetoothDevice or null if connection failed
 */
export const connectGlucoseMeter = async (): Promise<BluetoothDevice | null> => {
  try {
    const device = await requestDevice([BLE_SERVICES.GLUCOSE.SERVICE]);
    return device;
  } catch (error) {
    console.error("Error connecting to glucose meter:", error);
    return null;
  }
};

/**
 * Get device information from a connected device
 * @param device Connected Bluetooth device
 * @returns Object containing manufacturer and model information
 */
export const getDeviceInfo = async (
  device: BluetoothDevice
): Promise<{ manufacturer: string; model: string }> => {
  try {
    const server = await device.gatt?.connect();
    if (!server) throw new Error("Failed to connect to GATT server");

    try {
      const service = await server.getPrimaryService(BLE_SERVICES.DEVICE_INFO.SERVICE);
      
      let manufacturer = "Unknown";
      let model = "Unknown";

      try {
        const manufacturerChar = await service.getCharacteristic(BLE_SERVICES.DEVICE_INFO.MANUFACTURER);
        const manufacturerValue = await manufacturerChar.readValue();
        manufacturer = new TextDecoder().decode(manufacturerValue);
      } catch (e) {
        console.warn("Could not read manufacturer:", e);
      }

      try {
        const modelChar = await service.getCharacteristic(BLE_SERVICES.DEVICE_INFO.MODEL_NUMBER);
        const modelValue = await modelChar.readValue();
        model = new TextDecoder().decode(modelValue);
      } catch (e) {
        console.warn("Could not read model:", e);
      }

      return { manufacturer, model };
    } catch (serviceError) {
      console.warn("Could not access device info service:", serviceError);
      return { 
        manufacturer: device.name?.split(' ')[0] || "Unknown", 
        model: device.name || "Unknown" 
      };
    }
  } catch (error) {
    console.error("Error getting device info:", error);
    return { manufacturer: "Unknown", model: "Unknown" };
  }
};

/**
 * Parse blood pressure reading from DataView
 * @param dataView DataView containing the blood pressure data
 * @returns Object containing systolic, diastolic, and pulse values
 */
export const parseBloodPressureReading = (
  dataView: DataView
): { systolic: number; diastolic: number; pulse: number } => {
  // Standard Blood Pressure Measurement format (IEEE 11073-20601)
  const flags = dataView.getUint8(0);
  
  // Check if values are in kPa (bit 0) or mmHg (bit 0 = 0)
  const isKPa = (flags & 0x01) === 0x01;
  
  // Read systolic, diastolic, and pulse values
  let systolic = dataView.getUint16(1, true); // little endian
  let diastolic = dataView.getUint16(3, true);
  let pulse = dataView.getUint16(5, true);
  
  // Convert from kPa to mmHg if necessary
  if (isKPa) {
    systolic = Math.round(systolic * 7.50062);
    diastolic = Math.round(diastolic * 7.50062);
  }
  
  return { systolic, diastolic, pulse };
};

/**
 * Read blood pressure data from a connected blood pressure monitor
 * @param device Connected blood pressure monitor
 * @returns Object containing blood pressure reading or null if reading failed
 */
export const readBloodPressureData = async (
  device: BluetoothDevice
): Promise<{ systolic: number; diastolic: number; pulse: number } | null> => {
  try {
    console.log("Starting BP reading from device:", device.name);
    
    // Connect to GATT server
    const server = await device.gatt?.connect();
    if (!server) {
      throw new Error("Failed to connect to GATT server");
    }
    console.log("GATT server connected successfully");
    
    // Try to discover all services
    console.log("Discovering all services...");
    let allServices: BluetoothRemoteGATTService[] = [];
    try {
      allServices = await server.getPrimaryServices();
      console.log("Available services:", allServices.length);
      console.log("Service UUIDs:", allServices.map(s => s.uuid));
    } catch (e) {
      console.warn("Could not discover all services:", e);
    }

    // First attempt with standard blood pressure service
    try {
      const bpService = await server.getPrimaryService(BLE_SERVICES.BLOOD_PRESSURE.SERVICE);
      console.log("Standard blood pressure service found!");
      
      // Get measurement characteristic
      const characteristic = await bpService.getCharacteristic(
        BLE_SERVICES.BLOOD_PRESSURE.MEASUREMENT
      );
      console.log("Blood pressure measurement characteristic found");
      
      // Set up notifications for readings
      await characteristic.startNotifications();
      console.log("Notifications started for blood pressure readings");
      
      // Wait for reading
      return await new Promise((resolve) => {
        const timeout = setTimeout(() => {
          console.warn("Blood pressure reading timed out");
          characteristic.stopNotifications().catch(e => console.error("Error stopping notifications:", e));
          resolve(null);
        }, 30000);
        
        characteristic.addEventListener('characteristicvaluechanged', (event) => {
          clearTimeout(timeout);
          console.log("Blood pressure data received from device!");
          
          // @ts-ignore
          const value = event?.target?.value as DataView;
          if (value) {
            try {
              const reading = parseBloodPressureReading(value);
              console.log("Successfully parsed reading:", reading);
              characteristic.stopNotifications().catch(e => console.error("Error stopping notifications:", e));
              resolve(reading);
            } catch (parseError) {
              console.error("Parse error:", parseError);
              characteristic.stopNotifications().catch(e => console.error("Error stopping notifications:", e));
              resolve(null);
            }
          } else {
            console.error("No value received from characteristic");
            characteristic.stopNotifications().catch(e => console.error("Error stopping notifications:", e));
            resolve(null);
          }
        });
      });
    } catch (standardServiceError) {
      console.warn("Standard BP service not found, trying alternative methods...", standardServiceError);
      
      // Try to use a service discovery approach
      if (allServices.length > 0) {
        console.log("Trying alternative services...");
        
        // Look for any service that might contain blood pressure data
        for (const service of allServices) {
          try {
            console.log("Examining service:", service.uuid);
            const characteristics = await service.getCharacteristics();
            
            for (const characteristic of characteristics) {
              console.log("Found characteristic:", characteristic.uuid);
              
              // Try to read data from this characteristic
              if (characteristic.properties.notify) {
                console.log("This characteristic supports notifications, trying it...");
                
                try {
                  await characteristic.startNotifications();
                  console.log("Notifications started for this characteristic");
                  
                  // Wait for potential reading from this characteristic
                  const reading = await new Promise<{ systolic: number; diastolic: number; pulse: number } | null>((resolve) => {
                    const timeout = setTimeout(() => {
                      console.log("Timeout waiting for this characteristic");
                      characteristic.stopNotifications().catch(e => console.error("Stop notification error:", e));
                      resolve(null);
                    }, 5000);
                    
                    characteristic.addEventListener('characteristicvaluechanged', (event) => {
                      clearTimeout(timeout);
                      console.log("Received data from this characteristic!");
                      characteristic.stopNotifications().catch(e => console.error("Stop notification error:", e));
                      
                      try {
                        // @ts-ignore
                        const value = event?.target?.value as DataView;
                        if (value && value.byteLength >= 6) {
                          // Try to parse as blood pressure data
                          resolve({
                            systolic: value.getUint16(0, true),
                            diastolic: value.getUint16(2, true),
                            pulse: value.getUint16(4, true)
                          });
                        } else {
                          resolve(null);
                        }
                      } catch (e) {
                        console.error("Error parsing data from this characteristic:", e);
                        resolve(null);
                      }
                    });
                  });
                  
                  if (reading) {
                    console.log("Successfully got reading from alternative characteristic!", reading);
                    return reading;
                  }
                } catch (notifyError) {
                  console.warn("Could not use this characteristic:", notifyError);
                }
              }
            }
          } catch (serviceError) {
            console.warn("Error exploring service:", serviceError);
          }
        }
      }
      
      // If we're here, none of the Bluetooth approaches worked
      console.log("Could not get reading from device");
      return null;
    }
  } catch (error) {
    console.error("Error reading blood pressure data:", error);
    return null;
  }
};

/**
 * Parse glucose reading from DataView
 * @param dataView DataView containing the glucose data
 * @returns Object containing glucose value and measurement type
 */
export const parseGlucoseReading = (
  dataView: DataView
): { value: number; type: string } => {
  // Standard Glucose Measurement format (IEEE 11073-20601)
  const flags = dataView.getUint8(0);
  
  // Read glucose concentration value
  const value = dataView.getUint16(1, true); // little endian
  
  // Determine measurement type based on flags
  let type = "General";
  if (flags & 0x02) type = "Fasting";
  else if (flags & 0x04) type = "Post-meal";
  else if (flags & 0x08) type = "Pre-meal";
  
  return { value, type };
};

/**
 * Read glucose data from a connected glucose meter
 * @param device Connected glucose meter
 * @returns Object containing glucose reading or null if reading failed
 */
export const readGlucoseData = async (
  device: BluetoothDevice
): Promise<{ value: number; type: string } | null> => {
  try {
    const server = await device.gatt?.connect();
    if (!server) throw new Error("Failed to connect to GATT server");

    const service = await server.getPrimaryService(BLE_SERVICES.GLUCOSE.SERVICE);
    const characteristic = await service.getCharacteristic(BLE_SERVICES.GLUCOSE.MEASUREMENT);

    await characteristic.startNotifications();

    return new Promise((resolve) => {
      const timeout = setTimeout(() => {
        characteristic.stopNotifications().catch(e => console.error("Error stopping notifications:", e));
        resolve(null);
      }, 30000);

      characteristic.addEventListener('characteristicvaluechanged', (event) => {
        clearTimeout(timeout);
        
        // @ts-ignore
        const value = event?.target?.value as DataView;
        if (value) {
          try {
            const reading = parseGlucoseReading(value);
            characteristic.stopNotifications().catch(e => console.error("Error stopping notifications:", e));
            resolve(reading);
          } catch (parseError) {
            console.error("Error parsing glucose data:", parseError);
            characteristic.stopNotifications().catch(e => console.error("Error stopping notifications:", e));
            resolve(null);
          }
        } else {
          characteristic.stopNotifications().catch(e => console.error("Error stopping notifications:", e));
          resolve(null);
        }
      });
    });
  } catch (error) {
    console.error("Error reading glucose data:", error);
    return null;
  }
};

// ==========================================
// ALT Connection Methods (USB/Serial/Manual)
// ==========================================

export interface ALTDeviceConfig {
  type: 'serial' | 'usb' | 'manual';
  name?: string;
  port?: string;
  baudRate?: number;
}

export interface ManualReading {
  systolic?: number;
  diastolic?: number;
  pulse?: number;
  glucose?: number;
  timestamp: Date;
  source: 'bluetooth' | 'usb' | 'manual';
}

export const SUPPORTED_BP_DEVICES = [
  { name: 'Omron BP725', protocol: 'bluetooth', uuid: '00001810-0000-1000-8000-00805f9b34fb' },
  { name: 'Omron Evolv', protocol: 'bluetooth', uuid: '00001810-0000-1000-8000-00805f9b34fb' },
  { name: 'Omron Series 10', protocol: 'bluetooth', uuid: '00001810-0000-1000-8000-00805f9b34fb' },
  { name: 'iHealth BP5', protocol: 'bluetooth', uuid: '00001810-0000-1000-8000-00805f9b34fb' },
  { name: 'Withings BPM Connect', protocol: 'bluetooth', uuid: '00001810-0000-1000-8000-00805f9b34fb' },
  { name: 'A&D UA-651BLE', protocol: 'bluetooth', uuid: '00001810-0000-1000-8000-00805f9b34fb' },
  { name: 'Generic USB Serial', protocol: 'usb', uuid: 'generic-serial' },
];

export const SUPPORTED_GLUCOSE_DEVICES = [
  { name: 'Contour Next One', protocol: 'bluetooth', uuid: '00001808-0000-1000-8000-00805f9b34fb' },
  { name: 'FreeStyle Libre', protocol: 'bluetooth', uuid: '00001808-0000-1000-8000-00805f9b34fb' },
  { name: 'OneTouch Ultra', protocol: 'bluetooth', uuid: '00001808-0000-1000-8000-00805f9b34fb' },
  { name: 'Accu-Chek Guide', protocol: 'bluetooth', uuid: '00001808-0000-1000-8000-00805f9b34fb' },
  { name: 'Dexcom G6', protocol: 'bluetooth', uuid: '00001808-0000-1000-8000-00805f9b34fb' },
  { name: 'Generic USB Meter', protocol: 'usb', uuid: 'generic-serial' },
];

export const getSupportedDevices = (type: 'bp' | 'glucose') => {
  return type === 'bp' ? SUPPORTED_BP_DEVICES : SUPPORTED_GLUCOSE_DEVICES;
};

export const isSerialSupported = (): boolean => {
  return typeof navigator !== 'undefined' && 'serial' in navigator;
};

export const connectSerialDevice = async (
  type: 'bp' | 'glucose'
): Promise<{ device: any; port: string } | null> => {
  if (!isSerialSupported()) {
    console.warn('Web Serial API not supported in this browser');
    return null;
  }

  try {
    const port = await navigator.serial.requestPort({
      filters: [
        { usbVendorId: 0x04E9 }, // Omron
        { usbVendorId: 0x1A61 }, // iHealth
        { usbVendorId: 0x21A9 }, // Withings
      ]
    });

    await port.open({ baudRate: 9600 });

    const device = {
      type: 'serial',
      port,
      name: 'USB Serial Device',
      connected: true
    };

    return { device, port: port.getInfo().usbProductId || 'unknown' };
  } catch (error) {
    console.error('Error connecting to serial device:', error);
    return null;
  }
};

export const readSerialData = async (
  device: any,
  timeout: number = 30000
): Promise<{ systolic: number; diastolic: number; pulse: number } | null> => {
  if (!device.port) {
    console.error('No port available for serial reading');
    return null;
  }

  const reader = device.port.readable.getReader();
  const chunks: Uint8Array[] = [];
  const startTime = Date.now();

  try {
    while (Date.now() - startTime < timeout) {
      const { done, value } = await reader.read();
      
      if (done) break;
      
      if (value) {
        chunks.push(value);
        const text = new TextDecoder().decode(new Uint8Array([...chunks.flat()]));
        
        const bpMatch = text.match(/(\d{2,3})\/(\d{2,3})\s*[/\s]\s*(\d{2,3})/);
        if (bpMatch) {
          return {
            systolic: parseInt(bpMatch[1]),
            diastolic: parseInt(bpMatch[2]),
            pulse: parseInt(bpMatch[3])
          };
        }
      }
    }
  } catch (error) {
    console.error('Error reading serial data:', error);
  } finally {
    reader.releaseLock();
  }

  return null;
};

export const disconnectDevice = async (device: any): Promise<boolean> => {
  try {
    if (device.type === 'bluetooth' && device.gatt?.connected) {
      device.gatt.disconnect();
    } else if (device.type === 'serial' && device.port?.open) {
      await device.port.close();
    }
    return true;
  } catch (error) {
    console.error('Error disconnecting device:', error);
    return false;
  }
};

export const validateReading = (
  type: 'bp' | 'glucose',
  values: { systolic?: number; diastolic?: number; pulse?: number; glucose?: number }
): { valid: boolean; errors: string[] } => {
  const errors: string[] = [];

  if (type === 'bp') {
    if (!values.systolic || values.systolic < 60 || values.systolic > 250) {
      errors.push('Systolic must be between 60-250 mmHg');
    }
    if (!values.diastolic || values.diastolic < 40 || values.diastolic > 150) {
      errors.push('Diastolic must be between 40-150 mmHg');
    }
    if (!values.pulse || values.pulse < 30 || values.pulse > 200) {
      errors.push('Pulse must be between 30-200 bpm');
    }
  } else {
    if (!values.glucose || values.glucose < 20 || values.glucose > 600) {
      errors.push('Glucose must be between 20-600 mg/dL');
    }
  }

  return { valid: errors.length === 0, errors };
};

export const getBPCategory = (systolic: number, diastolic: number): string => {
  if (systolic < 120 && diastolic < 80) return 'Normal';
  if (systolic >= 120 && systolic <= 129 && diastolic < 80) return 'Elevated';
  if ((systolic >= 130 && systolic <= 139) || (diastolic >= 80 && diastolic <= 89)) return 'Stage 1 Hypertension';
  if (systolic >= 140 || diastolic >= 90) return 'Stage 2 Hypertension';
  if (systolic > 180 || diastolic > 120) return 'Hypertensive Crisis';
  return 'Unknown';
};

export const getGlucoseCategory = (value: number, type: string = 'random'): string => {
  const isFasting = type === 'fasting' || type === 'pre-meal';
  
  if (value < 70) return 'Low (Hypoglycemia)';
  if (isFasting) {
    if (value <= 100) return 'Normal';
    if (value <= 125) return 'Prediabetes';
    return 'Diabetes Range';
  } else {
    if (value <= 140) return 'Normal';
    if (value <= 199) return 'Prediabetes';
    return 'Diabetes Range';
  }
};