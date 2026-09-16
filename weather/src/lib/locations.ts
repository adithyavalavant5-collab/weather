import { IndianLocation } from './types';

// Comprehensive Indian states + UTs with major cities/towns/villages
// Population figures approximated from public census data.

export interface StateInfo {
  code: string;
  name: string;
  capital: string;
  districts: DistrictInfo[];
}

export interface DistrictInfo {
  name: string;
  hq: string;
  lat: number;
  lng: number;
}

export const INDIA_STATES: StateInfo[] = [
  {
    code: 'TN', name: 'Tamil Nadu', capital: 'Chennai',
    districts: [
      { name: 'Chennai', hq: 'Chennai', lat: 13.0827, lng: 80.2707 },
      { name: 'Dindigul', hq: 'Dindigul', lat: 10.3673, lng: 77.9803 },
      { name: 'Madurai', hq: 'Madurai', lat: 9.9252, lng: 78.1198 },
      { name: 'Coimbatore', hq: 'Coimbatore', lat: 11.0168, lng: 76.9558 },
      { name: 'Tiruchirappalli', hq: 'Tiruchirappalli', lat: 10.7905, lng: 78.7047 },
      { name: 'Salem', hq: 'Salem', lat: 11.6643, lng: 78.1460 },
      { name: 'Tirunelveli', hq: 'Tirunelveli', lat: 8.7139, lng: 77.7567 },
      { name: 'Thanjavur', hq: 'Thanjavur', lat: 10.7870, lng: 79.1378 },
      { name: 'Vellore', hq: 'Vellore', lat: 12.9165, lng: 79.1325 },
      { name: 'Erode', hq: 'Erode', lat: 11.3410, lng: 77.7170 },
    ],
  },
  {
    code: 'KA', name: 'Karnataka', capital: 'Bengaluru',
    districts: [
      { name: 'Bengaluru Urban', hq: 'Bengaluru', lat: 12.9716, lng: 77.5946 },
      { name: 'Mysuru', hq: 'Mysuru', lat: 12.2958, lng: 76.6394 },
      { name: 'Mangaluru', hq: 'Mangaluru', lat: 12.9141, lng: 74.8560 },
      { name: 'Hubballi-Dharwad', hq: 'Hubballi', lat: 15.3647, lng: 75.1240 },
      { name: 'Belagavi', hq: 'Belagavi', lat: 15.8497, lng: 74.4977 },
      { name: 'Kalaburagi', hq: 'Kalaburagi', lat: 17.3297, lng: 76.8343 },
      { name: 'Dakshina Kannada', hq: 'Mangaluru', lat: 12.9141, lng: 74.8560 },
      { name: 'Udupi', hq: 'Udupi', lat: 13.3409, lng: 74.7421 },
    ],
  },
  {
    code: 'KL', name: 'Kerala', capital: 'Thiruvananthapuram',
    districts: [
      { name: 'Thiruvananthapuram', hq: 'Thiruvananthapuram', lat: 8.5241, lng: 76.9366 },
      { name: 'Ernakulam', hq: 'Kochi', lat: 10.0151, lng: 76.2239 },
      { name: 'Kozhikode', hq: 'Kozhikode', lat: 11.2588, lng: 75.7804 },
      { name: 'Thrissur', hq: 'Thrissur', lat: 10.5276, lng: 76.2144 },
      { name: 'Alappuzha', hq: 'Alappuzha', lat: 9.4981, lng: 76.3388 },
      { name: 'Idukki', hq: 'Painavu', lat: 9.8461, lng: 76.9677 },
      { name: 'Wayanad', hq: 'Kalpetta', lat: 11.6854, lng: 76.1320 },
    ],
  },
  {
    code: 'AP', name: 'Andhra Pradesh', capital: 'Amaravati',
    districts: [
      { name: 'Visakhapatnam', hq: 'Visakhapatnam', lat: 17.6868, lng: 83.2185 },
      { name: 'Guntur', hq: 'Guntur', lat: 16.3067, lng: 80.4365 },
      { name: 'Krishna', hq: 'Machilipatnam', lat: 16.1875, lng: 81.2900 },
      { name: 'Chittoor', hq: 'Chittoor', lat: 13.2172, lng: 79.1003 },
      { name: 'Kurnool', hq: 'Kurnool', lat: 15.8281, lng: 78.0373 },
      { name: 'Nellore', hq: 'Nellore', lat: 14.4426, lng: 79.9865 },
    ],
  },
  {
    code: 'TS', name: 'Telangana', capital: 'Hyderabad',
    districts: [
      { name: 'Hyderabad', hq: 'Hyderabad', lat: 17.3850, lng: 78.4867 },
      { name: 'Warangal', hq: 'Warangal', lat: 17.9689, lng: 79.5941 },
      { name: 'Nizamabad', hq: 'Nizamabad', lat: 18.6725, lng: 78.0940 },
      { name: 'Karimnagar', hq: 'Karimnagar', lat: 18.4386, lng: 79.1288 },
      { name: 'Khammam', hq: 'Khammam', lat: 17.2473, lng: 80.1514 },
    ],
  },
  {
    code: 'MH', name: 'Maharashtra', capital: 'Mumbai',
    districts: [
      { name: 'Mumbai City', hq: 'Mumbai', lat: 19.0760, lng: 72.8777 },
      { name: 'Pune', hq: 'Pune', lat: 18.5204, lng: 73.8567 },
      { name: 'Nagpur', hq: 'Nagpur', lat: 21.1458, lng: 79.0882 },
      { name: 'Nashik', hq: 'Nashik', lat: 19.9975, lng: 73.7898 },
      { name: 'Aurangabad', hq: 'Aurangabad', lat: 19.8762, lng: 75.3433 },
      { name: 'Thane', hq: 'Thane', lat: 19.2183, lng: 72.9781 },
      { name: 'Kolhapur', hq: 'Kolhapur', lat: 16.7050, lng: 74.2433 },
      { name: 'Solapur', hq: 'Solapur', lat: 17.6599, lng: 75.9064 },
    ],
  },
  {
    code: 'DL', name: 'Delhi (NCT)', capital: 'New Delhi',
    districts: [
      { name: 'New Delhi', hq: 'New Delhi', lat: 28.6139, lng: 77.2090 },
      { name: 'South Delhi', hq: 'Defence Colony', lat: 28.5244, lng: 77.1855 },
      { name: 'North Delhi', hq: 'Civil Lines', lat: 28.7050, lng: 77.2000 },
      { name: 'East Delhi', hq: 'Preet Vihar', lat: 28.6280, lng: 77.2949 },
      { name: 'Dwarka', hq: 'Dwarka', lat: 28.5921, lng: 77.0460 },
    ],
  },
  {
    code: 'UP', name: 'Uttar Pradesh', capital: 'Lucknow',
    districts: [
      { name: 'Lucknow', hq: 'Lucknow', lat: 26.8467, lng: 80.9462 },
      { name: 'Kanpur Nagar', hq: 'Kanpur', lat: 26.4499, lng: 80.3319 },
      { name: 'Varanasi', hq: 'Varanasi', lat: 25.3176, lng: 82.9739 },
      { name: 'Agra', hq: 'Agra', lat: 27.1767, lng: 78.0081 },
      { name: 'Meerut', hq: 'Meerut', lat: 28.9845, lng: 77.7064 },
      { name: 'Allahabad (Prayagraj)', hq: 'Prayagraj', lat: 25.4358, lng: 81.8463 },
      { name: 'Ghaziabad', hq: 'Ghaziabad', lat: 28.6692, lng: 77.4538 },
      { name: 'Noida (Gautam Budh Nagar)', hq: 'Noida', lat: 28.5355, lng: 77.3910 },
    ],
  },
  {
    code: 'WB', name: 'West Bengal', capital: 'Kolkata',
    districts: [
      { name: 'Kolkata', hq: 'Kolkata', lat: 22.5726, lng: 88.3639 },
      { name: 'Howrah', hq: 'Howrah', lat: 22.5958, lng: 88.2636 },
      { name: 'Darjeeling', hq: 'Darjeeling', lat: 27.0410, lng: 88.2663 },
      { name: 'Siliguri', hq: 'Siliguri', lat: 26.7271, lng: 88.3953 },
      { name: 'North 24 Parganas', hq: 'Barasat', lat: 22.7333, lng: 88.4833 },
      { name: 'Paschim Medinipur', hq: 'Medinipur', lat: 22.4250, lng: 87.3250 },
    ],
  },
  {
    code: 'GJ', name: 'Gujarat', capital: 'Gandhinagar',
    districts: [
      { name: 'Ahmedabad', hq: 'Ahmedabad', lat: 23.0225, lng: 72.5714 },
      { name: 'Surat', hq: 'Surat', lat: 21.1702, lng: 72.8311 },
      { name: 'Vadodara', hq: 'Vadodara', lat: 22.3072, lng: 73.1812 },
      { name: 'Rajkot', hq: 'Rajkot', lat: 22.3039, lng: 70.8022 },
      { name: 'Bhavnagar', hq: 'Bhavnagar', lat: 21.7645, lng: 72.1519 },
      { name: 'Kutch', hq: 'Bhuj', lat: 23.2530, lng: 69.6693 },
    ],
  },
  {
    code: 'RJ', name: 'Rajasthan', capital: 'Jaipur',
    districts: [
      { name: 'Jaipur', hq: 'Jaipur', lat: 26.9124, lng: 75.7873 },
      { name: 'Jodhpur', hq: 'Jodhpur', lat: 26.2389, lng: 73.0243 },
      { name: 'Udaipur', hq: 'Udaipur', lat: 24.5854, lng: 73.7125 },
      { name: 'Kota', hq: 'Kota', lat: 25.2138, lng: 75.8648 },
      { name: 'Ajmer', hq: 'Ajmer', lat: 26.4499, lng: 74.6399 },
      { name: 'Bikaner', hq: 'Bikaner', lat: 28.0229, lng: 73.3119 },
    ],
  },
  {
    code: 'PB', name: 'Punjab', capital: 'Chandigarh',
    districts: [
      { name: 'Ludhiana', hq: 'Ludhiana', lat: 30.9010, lng: 75.8573 },
      { name: 'Amritsar', hq: 'Amritsar', lat: 31.6340, lng: 74.8723 },
      { name: 'Jalandhar', hq: 'Jalandhar', lat: 31.3260, lng: 75.5762 },
      { name: 'Patiala', hq: 'Patiala', lat: 30.3398, lng: 76.3869 },
      { name: 'Mohali', hq: 'Mohali', lat: 30.7046, lng: 76.7179 },
    ],
  },
  {
    code: 'HR', name: 'Haryana', capital: 'Chandigarh',
    districts: [
      { name: 'Gurugram', hq: 'Gurugram', lat: 28.4595, lng: 77.0266 },
      { name: 'Faridabad', hq: 'Faridabad', lat: 28.4089, lng: 77.3178 },
      { name: 'Karnal', hq: 'Karnal', lat: 29.6857, lng: 76.9905 },
      { name: 'Hisar', hq: 'Hisar', lat: 29.1492, lng: 75.7217 },
      { name: 'Panipat', hq: 'Panipat', lat: 29.3909, lng: 76.9635 },
    ],
  },
  {
    code: 'BR', name: 'Bihar', capital: 'Patna',
    districts: [
      { name: 'Patna', hq: 'Patna', lat: 25.5941, lng: 85.1376 },
      { name: 'Gaya', hq: 'Gaya', lat: 24.7914, lng: 85.0002 },
      { name: 'Bhagalpur', hq: 'Bhagalpur', lat: 25.2425, lng: 86.9842 },
      { name: 'Muzaffarpur', hq: 'Muzaffarpur', lat: 26.1209, lng: 85.3647 },
      { name: 'Purnia', hq: 'Purnia', lat: 25.7787, lng: 87.4744 },
    ],
  },
  {
    code: 'OD', name: 'Odisha', capital: 'Bhubaneswar',
    districts: [
      { name: 'Khordha', hq: 'Bhubaneswar', lat: 20.2961, lng: 85.8245 },
      { name: 'Cuttack', hq: 'Cuttack', lat: 20.4625, lng: 85.8828 },
      { name: 'Puri', hq: 'Puri', lat: 19.8135, lng: 85.8312 },
      { name: 'Sundargarh', hq: 'Sundargarh', lat: 22.1167, lng: 84.0333 },
      { name: 'Balasore', hq: 'Balasore', lat: 21.4936, lng: 86.9336 },
      { name: 'Ganjam', hq: 'Chhatrapur', lat: 19.3829, lng: 84.9344 },
    ],
  },
  {
    code: 'AS', name: 'Assam', capital: 'Dispur',
    districts: [
      { name: 'Kamrup Metro', hq: 'Guwahati', lat: 26.1445, lng: 91.7362 },
      { name: 'Dibrugarh', hq: 'Dibrugarh', lat: 27.4728, lng: 94.9120 },
      { name: 'Jorhat', hq: 'Jorhat', lat: 26.7509, lng: 94.2037 },
      { name: 'Silchar', hq: 'Silchar', lat: 24.8333, lng: 92.7789 },
      { name: 'Tezpur', hq: 'Tezpur', lat: 26.6333, lng: 92.8000 },
    ],
  },
  {
    code: 'WB_NA', name: 'Arunachal Pradesh', capital: 'Itanagar',
    districts: [
      { name: 'Papum Pare', hq: 'Itanagar', lat: 27.0844, lng: 93.6053 },
      { name: 'Tawang', hq: 'Tawang', lat: 27.5860, lng: 91.8594 },
      { name: 'West Kameng', hq: 'Bomdila', lat: 27.2639, lng: 92.4167 },
    ],
  },
  {
    code: 'PY', name: 'Puducherry (UT)', capital: 'Puducherry',
    districts: [
      { name: 'Puducherry', hq: 'Puducherry', lat: 11.9416, lng: 79.8083 },
      { name: 'Karaikal', hq: 'Karaikal', lat: 10.9167, lng: 79.8333 },
      { name: 'Yanam', hq: 'Yanam', lat: 16.7333, lng: 82.2167 },
      { name: 'Mahe', hq: 'Mahe', lat: 11.7000, lng: 75.5333 },
    ],
  },
  {
    code: 'GA', name: 'Goa', capital: 'Panaji',
    districts: [
      { name: 'North Goa', hq: 'Panaji', lat: 15.4909, lng: 73.8278 },
      { name: 'South Goa', hq: 'Margao', lat: 15.2750, lng: 73.9656 },
    ],
  },
  {
    code: 'JK', name: 'Jammu & Kashmir (UT)', capital: 'Srinagar',
    districts: [
      { name: 'Srinagar', hq: 'Srinagar', lat: 34.0837, lng: 74.7973 },
      { name: 'Jammu', hq: 'Jammu', lat: 32.7266, lng: 74.8570 },
      { name: 'Anantnag', hq: 'Anantnag', lat: 33.7333, lng: 75.1500 },
      { name: 'Baramulla', hq: 'Baramulla', lat: 34.1989, lng: 74.3636 },
    ],
  },
  {
    code: 'CH', name: 'Chandigarh (UT)', capital: 'Chandigarh',
    districts: [{ name: 'Chandigarh', hq: 'Chandigarh', lat: 30.7333, lng: 76.7794 }],
  },
  // ===== ADDITIVE: All remaining India states + UTs with their districts =====
  {
    code: 'JH', name: 'Jharkhand', capital: 'Ranchi',
    districts: [
      { name: 'Ranchi', hq: 'Ranchi', lat: 23.3441, lng: 85.3096 },
      { name: 'Dhanbad', hq: 'Dhanbad', lat: 23.7957, lng: 86.4304 },
      { name: 'Bokaro', hq: 'Bokaro Steel City', lat: 23.6384, lng: 86.1610 },
      { name: 'Jamshedpur (East Singhbhum)', hq: 'Jamshedpur', lat: 22.8046, lng: 86.2029 },
      { name: 'Hazaribagh', hq: 'Hazaribagh', lat: 23.9652, lng: 85.3669 },
      { name: 'Deoghar', hq: 'Deoghar', lat: 24.4817, lng: 86.6990 },
      { name: 'Giridih', hq: 'Giridih', lat: 24.1810, lng: 86.3023 },
      { name: 'Ramgarh', hq: 'Ramgarh Cantonment', lat: 23.6230, lng: 85.5050 },
      { name: 'Sahibganj', hq: 'Sahibganj', lat: 25.2484, lng: 87.6197 },
      { name: 'Palamu', hq: 'Medininagar', lat: 23.9936, lng: 84.3970 },
    ],
  },
  {
    code: 'UT', name: 'Uttarakhand', capital: 'Dehradun',
    districts: [
      { name: 'Dehradun', hq: 'Dehradun', lat: 30.3165, lng: 78.0322 },
      { name: 'Haridwar', hq: 'Haridwar', lat: 29.9457, lng: 78.1646 },
      { name: 'Nainital', hq: 'Nainital', lat: 29.3919, lng: 79.4542 },
      { name: 'Tehri Garhwal', hq: 'New Tehri', lat: 30.3726, lng: 78.4334 },
      { name: 'Pauri Garhwal', hq: 'Pauri', lat: 30.1465, lng: 78.7759 },
      { name: 'Almora', hq: 'Almora', lat: 29.5978, lng: 79.6584 },
      { name: 'Chamoli', hq: 'Gopeshwar', lat: 30.4140, lng: 79.5690 },
      { name: 'Udham Singh Nagar', hq: 'Rudrapur', lat: 28.9940, lng: 79.4030 },
      { name: 'Pithoragarh', hq: 'Pithoragarh', lat: 29.5799, lng: 80.2188 },
      { name: 'Champawat', hq: 'Champawat', lat: 29.3300, lng: 80.1100 },
    ],
  },
  {
    code: 'HP', name: 'Himachal Pradesh', capital: 'Shimla',
    districts: [
      { name: 'Shimla', hq: 'Shimla', lat: 31.1048, lng: 77.1734 },
      { name: 'Kullu', hq: 'Kullu', lat: 31.9580, lng: 77.1090 },
      { name: 'Manali (sub-tehsil)', hq: 'Manali', lat: 32.2394, lng: 77.1887 },
      { name: 'Solan', hq: 'Solan', lat: 30.9045, lng: 77.0967 },
      { name: 'Mandi', hq: 'Mandi', lat: 31.7100, lng: 76.9320 },
      { name: 'Kangra', hq: 'Dharamshala', lat: 32.2191, lng: 76.3230 },
      { name: 'Chamba', hq: 'Chamba', lat: 32.5550, lng: 76.1300 },
      { name: 'Una', hq: 'Una', lat: 31.4680, lng: 76.2750 },
      { name: 'Bilaspur', hq: 'Bilaspur', lat: 31.3450, lng: 76.7570 },
      { name: 'Hamirpur', hq: 'Hamirpur', lat: 31.6800, lng: 76.5250 },
    ],
  },
  {
    code: 'CG', name: 'Chhattisgarh', capital: 'Raipur',
    districts: [
      { name: 'Raipur', hq: 'Raipur', lat: 21.2514, lng: 81.6296 },
      { name: 'Durg', hq: 'Durg', lat: 21.1904, lng: 81.2849 },
      { name: 'Bhilai (Durg district)', hq: 'Bhilai', lat: 21.2256, lng: 81.6640 },
      { name: 'Bilaspur', hq: 'Bilaspur', lat: 22.0797, lng: 82.1390 },
      { name: 'Korba', hq: 'Korba', lat: 22.3595, lng: 82.7501 },
      { name: 'Dhamtari', hq: 'Dhamtari', lat: 20.5833, lng: 81.5500 },
      { name: 'Rajnandgaon', hq: 'Rajnandgaon', lat: 21.1000, lng: 81.0333 },
      { name: 'Jagdalpur (Bastar)', hq: 'Jagdalpur', lat: 19.0730, lng: 81.9620 },
      { name: 'Ambikapur (Surguja)', hq: 'Ambikapur', lat: 23.1167, lng: 83.0167 },
      { name: 'Mahasamund', hq: 'Mahasamund', lat: 21.1000, lng: 82.1000 },
    ],
  },
  {
    code: 'MN', name: 'Manipur', capital: 'Imphal',
    districts: [
      { name: 'Imphal West', hq: 'Imphal', lat: 24.8170, lng: 93.9368 },
      { name: 'Imphal East', hq: 'Imphal', lat: 24.7700, lng: 93.9900 },
      { name: 'Thoubal', hq: 'Thoubal', lat: 24.6000, lng: 94.0800 },
      { name: 'Bishnupur', hq: 'Bishnupur', lat: 24.6130, lng: 93.7760 },
      { name: 'Churachandpur', hq: 'Churachandpur', lat: 24.3300, lng: 93.7000 },
      { name: 'Senapati', hq: 'Senapati', lat: 25.2400, lng: 94.0400 },
      { name: 'Ukhrul', hq: 'Ukhrul', lat: 25.0900, lng: 94.3600 },
      { name: 'Chandel', hq: 'Chandel', lat: 24.3400, lng: 94.2700 },
      { name: 'Tamenglong', hq: 'Tamenglong', lat: 25.4300, lng: 93.5000 },
      { name: 'Kohima-adjacent (Jiribam)', hq: 'Jiribam', lat: 24.7900, lng: 93.1300 },
    ],
  },
  {
    code: 'ML', name: 'Meghalaya', capital: 'Shillong',
    districts: [
      { name: 'East Khasi Hills', hq: 'Shillong', lat: 25.5788, lng: 91.8933 },
      { name: 'West Khasi Hills', hq: 'Nongstoin', lat: 25.5130, lng: 91.2630 },
      { name: 'Ri-Bhoi', hq: 'Nongpoh', lat: 25.9050, lng: 91.8790 },
      { name: 'East Jaintia Hills', hq: 'Khliehriat', lat: 25.3570, lng: 92.5500 },
      { name: 'West Jaintia Hills', hq: 'Jowai', lat: 25.4500, lng: 92.2600 },
      { name: 'East Garo Hills', hq: 'Williamnagar', lat: 25.4600, lng: 90.6000 },
      { name: 'West Garo Hills', hq: 'Tura', lat: 25.5100, lng: 90.2200 },
      { name: 'South Garo Hills', hq: 'Baghmara', lat: 25.1900, lng: 90.6300 },
      { name: 'North Garo Hills', hq: 'Resubelpara', lat: 25.8900, lng: 90.6300 },
      { name: 'South West Garo Hills', hq: 'Ampati', lat: 25.4700, lng: 90.2200 },
    ],
  },
  {
    code: 'MZ', name: 'Mizoram', capital: 'Aizawl',
    districts: [
      { name: 'Aizawl', hq: 'Aizawl', lat: 23.7271, lng: 92.7176 },
      { name: 'Lunglei', hq: 'Lunglei', lat: 22.8333, lng: 92.7500 },
      { name: 'Champhai', hq: 'Champhai', lat: 23.4567, lng: 93.3290 },
      { name: 'Kolasib', hq: 'Kolasib', lat: 24.2267, lng: 92.6670 },
      { name: 'Serchhip', hq: 'Serchhip', lat: 23.3000, lng: 92.8500 },
      { name: 'Mamit', hq: 'Mamit', lat: 23.9300, lng: 92.4900 },
      { name: 'Saiha', hq: 'Saiha', lat: 22.4900, lng: 92.9800 },
      { name: 'Lawngtlai', hq: 'Lawngtlai', lat: 22.5300, lng: 92.6600 },
      { name: 'Saitual', hq: 'Saitual', lat: 23.7100, lng: 93.0400 },
      { name: 'Khawzawl', hq: 'Khawzawl', lat: 23.6900, lng: 93.1500 },
    ],
  },
  {
    code: 'NL', name: 'Nagaland', capital: 'Kohima',
    districts: [
      { name: 'Kohima', hq: 'Kohima', lat: 25.6751, lng: 94.1086 },
      { name: 'Dimapur', hq: 'Dimapur', lat: 25.9090, lng: 93.7250 },
      { name: 'Mokokchung', hq: 'Mokokchung', lat: 26.3300, lng: 94.5100 },
      { name: 'Wokha', hq: 'Wokha', lat: 26.1000, lng: 94.2600 },
      { name: 'Mon', hq: 'Mon', lat: 26.7300, lng: 95.0800 },
      { name: 'Zunheboto', hq: 'Zunheboto', lat: 26.0100, lng: 94.4800 },
      { name: 'Phek', hq: 'Phek', lat: 25.4700, lng: 94.4500 },
      { name: 'Tuensang', hq: 'Tuensang', lat: 26.2700, lng: 94.8300 },
      { name: 'Kiphire', hq: 'Kiphire', lat: 25.8800, lng: 94.7900 },
      { name: 'Longleng', hq: 'Longleng', lat: 26.6300, lng: 94.8800 },
      { name: 'Peren', hq: 'Peren', lat: 25.5100, lng: 93.7000 },
    ],
  },
  {
    code: 'TR', name: 'Tripura', capital: 'Agartala',
    districts: [
      { name: 'West Tripura', hq: 'Agartala', lat: 23.8315, lng: 91.2868 },
      { name: 'Gomati', hq: 'Udaipur', lat: 23.5300, lng: 91.4900 },
      { name: 'Sepahijala', hq: 'Bishramganj', lat: 23.6500, lng: 91.3000 },
      { name: 'Khowai', hq: 'Khowai', lat: 24.2500, lng: 91.6100 },
      { name: 'Unakoti', hq: 'Kailashahar', lat: 24.3300, lng: 92.0000 },
      { name: 'North Tripura', hq: 'Dharmanagar', lat: 24.3700, lng: 92.1700 },
      { name: 'Dhalai', hq: 'Ambassa', lat: 23.9300, lng: 91.6800 },
      { name: 'South Tripura', hq: 'Belonia', lat: 23.2500, lng: 91.4500 },
    ],
  },
  {
    code: 'SK', name: 'Sikkim', capital: 'Gangtok',
    districts: [
      { name: 'Gangtok', hq: 'Gangtok', lat: 27.3389, lng: 88.6065 },
      { name: 'Mangan (North Sikkim)', hq: 'Mangan', lat: 27.5000, lng: 88.5300 },
      { name: 'Gyalshing (West Sikkim)', hq: 'Gyalshing', lat: 27.2900, lng: 88.2600 },
      { name: 'Namchi (South Sikkim)', hq: 'Namchi', lat: 27.2800, lng: 88.3500 },
      { name: 'Rangpo (East Sikkim)', hq: 'Rangpo', lat: 27.1800, lng: 88.5300 },
      { name: 'Soreng (West Sikkim)', hq: 'Soreng', lat: 27.1700, lng: 88.2400 },
      { name: 'Pakyong (East Sikkim)', hq: 'Pakyong', lat: 27.2300, lng: 88.6000 },
    ],
  },
  {
    code: 'AN', name: 'Andaman & Nicobar Islands (UT)', capital: 'Port Blair',
    districts: [
      { name: 'South Andaman', hq: 'Port Blair', lat: 11.6233, lng: 92.7265 },
      { name: 'North & Middle Andaman', hq: 'Mayabunder', lat: 12.2500, lng: 92.5800 },
      { name: 'Nicobar', hq: 'Car Nicobar', lat: 9.1500, lng: 92.7800 },
      { name: 'Little Andaman', hq: 'Hut Bay', lat: 10.7500, lng: 92.5500 },
    ],
  },
  {
    code: 'LD', name: 'Lakshadweep (UT)', capital: 'Kavaratti',
    districts: [
      { name: 'Kavaratti', hq: 'Kavaratti', lat: 10.5667, lng: 72.6417 },
      { name: 'Agatti', hq: 'Agatti', lat: 10.8500, lng: 72.2000 },
      { name: 'Minicoy', hq: 'Minicoy', lat: 8.2800, lng: 73.0500 },
      { name: 'Amini', hq: 'Amini', lat: 11.1200, lng: 72.7700 },
      { name: 'Andrott', hq: 'Andrott', lat: 10.8300, lng: 73.6800 },
      { name: 'Kiltan', hq: 'Kiltan', lat: 11.1500, lng: 73.3800 },
      { name: 'Kalpeni', hq: 'Kalpeni', lat: 10.0800, lng: 73.6500 },
      { name: 'Chetlat', hq: 'Chetlat', lat: 11.6900, lng: 72.2300 },
      { name: 'Bitra', hq: 'Bitra', lat: 11.6000, lng: 72.1800 },
      { name: 'Kadmat', hq: 'Kadmat', lat: 11.2200, lng: 72.7700 },
    ],
  },
  {
    code: 'DNH', name: 'Dadra & Nagar Haveli and Daman & Diu (UT)', capital: 'Daman',
    districts: [
      { name: 'Daman', hq: 'Daman', lat: 20.3974, lng: 72.8328 },
      { name: 'Diu', hq: 'Diu', lat: 20.7144, lng: 70.9878 },
      { name: 'Dadra', hq: 'Dadra', lat: 20.3200, lng: 73.0000 },
      { name: 'Silvassa', hq: 'Silvassa', lat: 20.2760, lng: 73.0082 },
      { name: 'Khanvel', hq: 'Khanvel', lat: 20.1800, lng: 73.0500 },
    ],
  },
  {
    code: 'LA', name: 'Ladakh (UT)', capital: 'Leh',
    districts: [
      { name: 'Leh', hq: 'Leh', lat: 34.1526, lng: 77.5770 },
      { name: 'Kargil', hq: 'Kargil', lat: 34.5540, lng: 76.1344 },
      { name: 'Nubra', hq: 'Diskit', lat: 34.5500, lng: 77.5800 },
      { name: 'Zanskar', hq: 'Padum', lat: 33.4700, lng: 76.9300 },
      { name: 'Changthang', hq: 'Nyoma', lat: 33.0000, lng: 78.3000 },
    ],
  },
  {
    code: 'MP', name: 'Madhya Pradesh', capital: 'Bhopal',
    districts: [
      { name: 'Bhopal', hq: 'Bhopal', lat: 23.2599, lng: 77.4126 },
      { name: 'Indore', hq: 'Indore', lat: 22.7196, lng: 75.8577 },
      { name: 'Jabalpur', hq: 'Jabalpur', lat: 23.1815, lng: 79.9864 },
      { name: 'Gwalior', hq: 'Gwalior', lat: 26.2183, lng: 78.1828 },
      { name: 'Ujjain', hq: 'Ujjain', lat: 23.1793, lng: 75.7849 },
      { name: 'Sagar', hq: 'Sagar', lat: 23.8388, lng: 78.7378 },
      { name: 'Rewa', hq: 'Rewa', lat: 24.5437, lng: 81.2976 },
      { name: 'Satna', hq: 'Satna', lat: 24.5810, lng: 80.7800 },
      { name: 'Ratlam', hq: 'Ratlam', lat: 23.3300, lng: 75.0400 },
      { name: 'Chhindwara', hq: 'Chhindwara', lat: 22.0667, lng: 78.9333 },
      { name: 'Betul', hq: 'Betul', lat: 21.9167, lng: 77.9000 },
      { name: 'Hoshangabad (Narmadapuram)', hq: 'Narmadapuram', lat: 22.7500, lng: 77.7167 },
      { name: 'Balaghat', hq: 'Balaghat', lat: 21.4833, lng: 80.1500 },
      { name: 'Khargone (West Nimar)', hq: 'Khargone', lat: 21.8250, lng: 75.6130 },
      { name: 'Khandwa (East Nimar)', hq: 'Khandwa', lat: 21.8230, lng: 76.3520 },
    ],
  },
];

// Flatten to all pickable locations
export const ALL_LOCATIONS: IndianLocation[] = INDIA_STATES.flatMap((s) =>
  s.districts.map((d) => ({
    id: `${s.code}-${d.name}`.replace(/\s+/g, '-').toLowerCase(),
    name: d.hq,
    state: s.name,
    district: d.name,
    type: (s.code === 'DL' || s.code === 'CH' || s.code === 'PY')
      ? 'state_capital'
      : 'district_hq',
    lat: d.lat,
    lng: d.lng,
  }))
);

export function searchLocations(query: string): IndianLocation[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];
  return ALL_LOCATIONS.filter((l) =>
    l.name.toLowerCase().includes(q) ||
    l.district.toLowerCase().includes(q) ||
    l.state.toLowerCase().includes(q)
  ).slice(0, 20);
}

export function findNearestLocation(lat: number, lng: number): IndianLocation {
  let best = ALL_LOCATIONS[0];
  let bestDist = Infinity;
  for (const loc of ALL_LOCATIONS) {
    const d = Math.hypot(loc.lat - lat, loc.lng - lng);
    if (d < bestDist) {
      bestDist = d;
      best = loc;
    }
  }
  return best;
}

// Get India's bounding box for map
export const INDIA_BBOX = {
  minLat: 6.5,
  maxLat: 37.5,
  minLng: 67.0,
  maxLng: 97.5,
};

// Approximate SVG path coordinates for state boundaries (simplified polygons)
// Used for the interactive India map. These are stylized, not survey-grade.
export const INDIA_OUTLINE_PATH =
  'M 240 80 L 260 70 L 280 75 L 300 70 L 320 80 L 340 90 L 360 85 L 380 100 L 390 120 L 410 130 L 430 140 L 440 160 L 450 180 L 460 200 L 470 220 L 475 240 L 470 260 L 460 280 L 445 300 L 430 320 L 410 340 L 390 360 L 370 380 L 350 395 L 330 405 L 310 410 L 290 405 L 270 395 L 250 380 L 230 360 L 215 340 L 200 320 L 190 300 L 185 280 L 180 260 L 175 240 L 170 220 L 165 200 L 165 180 L 175 160 L 190 140 L 210 120 L 225 100 Z';

// Approximate state centroids for the simplified SVG map (x, y in 0-500 viewBox)
// These are stylistic positions chosen for visual clarity, not geographic precision.
export const STATE_MAP_POSITIONS: Record<string, { x: number; y: number; w: number; h: number }> = {
  JK: { x: 195, y: 80, w: 60, h: 40 },
  PB: { x: 215, y: 130, w: 50, h: 30 },
  HR: { x: 220, y: 165, w: 60, h: 30 },
  DL: { x: 245, y: 155, w: 25, h: 20 },
  RJ: { x: 200, y: 195, w: 80, h: 60 },
  UP: { x: 280, y: 160, w: 90, h: 50 },
  BR: { x: 370, y: 220, w: 60, h: 40 },
  AS: { x: 410, y: 200, w: 60, h: 40 },
  WB_NA: { x: 440, y: 175, w: 50, h: 40 },
  WB: { x: 405, y: 255, w: 50, h: 50 },
  OD: { x: 350, y: 280, w: 60, h: 50 },
  GJ: { x: 175, y: 245, w: 60, h: 70 },
  MH: { x: 230, y: 260, w: 80, h: 60 },
  MP: { x: 250, y: 200, w: 80, h: 60 },
  CG: { x: 320, y: 240, w: 50, h: 50 },
  CT: { x: 290, y: 320, w: 70, h: 50 },
  TS: { x: 305, y: 295, w: 60, h: 50 },
  AP: { x: 310, y: 340, w: 70, h: 60 },
  KA: { x: 245, y: 335, w: 60, h: 60 },
  KL: { x: 220, y: 380, w: 50, h: 50 },
  TN: { x: 270, y: 390, w: 60, h: 50 },
  GA: { x: 230, y: 305, w: 30, h: 25 },
  PY: { x: 295, y: 415, w: 25, h: 20 },
  CH: { x: 240, y: 145, w: 25, h: 20 },
};

// List of states for the simplified map (union of code + name)
export const STATE_LIST = INDIA_STATES.map((s) => ({
  code: s.code,
  name: s.name,
  capital: s.capital,
}));
