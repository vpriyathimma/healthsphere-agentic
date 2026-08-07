// Clinical seed — canonical, SYNCED with the tool Lambdas (MRN-1001..MRN-1004).
// Same patients, IDs, attendings, care teams as get_patient / get_lab_results /
// request_discharge. id == mrn == the tool key, so the agent resolves directly.

const CLINICIANS = {
  "emma.davis@healthsphere.com":    { name: "Dr. Emma Davis",    specialty: "Cardiology",  department: "Cardiology" },
  "david.brown@healthsphere.com":   { name: "Dr. David Brown",   specialty: "Orthopedics", department: "Orthopedics" },
  "sarah.johnson@healthsphere.com": { name: "Dr. Sarah Johnson", specialty: "Neurology",   department: "Neurology" },
  "lily.armstrong@healthsphere.com":{ name: "Lily Armstrong",    department: "Nursing" },
  "james.porter@healthsphere.com":  { name: "James Porter",      department: "Nursing" },
  "ethan.cooper@healthsphere.com":  { name: "Ethan Cooper" },
};

const PATIENTS = [
  { id: "MRN-1001", email: "ethan.cooper@healthsphere.com", mrn: "MRN-1001", name: "Ethan Cooper",
    dob: "1985-03-14", sex: "Male", ward: "General Ward", service: "Cardiology",
    attending: "Dr. Emma Davis", careTeam: ["emma.davis@healthsphere.com", "mike.wilson@healthsphere.com"],
    status: "guarded", allergies: ["Penicillin", "Sulfa drugs"],
    vitals: { hr: 88, bp: "142/90", rr: 17, temp: 37.0, spo2: 97, at: "2026-07-19T07:40:00Z" },
    encounters: [
      { id: "e1", date: "2026-07-17", type: "Admission", note: "Atrial fibrillation with hypertension; admitted for rate control." },
      { id: "e2", date: "2026-07-18", type: "Cardiology", note: "Care plan: cardiac monitoring, rate control, anticoagulation evaluation." },
    ],
    orders: [
      { id: "o1", kind: "Medication", detail: "Amiodarone 200mg oral BID", state: "signed", by: "Dr. Emma Davis" },
      { id: "o2", kind: "Medication", detail: "Lisinopril 20mg oral daily", state: "signed", by: "Dr. Emma Davis" },
    ] },

  { id: "MRN-1002", email: "mia.harrison@healthsphere.com", mrn: "MRN-1002", name: "Mia Harrison",
    dob: "1992-07-22", sex: "Female", ward: "General Ward", service: "Orthopedics",
    attending: "Dr. David Brown", careTeam: ["david.brown@healthsphere.com", "ava.mitchell@healthsphere.com"],
    status: "stable", allergies: [],
    vitals: { hr: 72, bp: "118/74", rr: 15, temp: 36.7, spo2: 100, at: "2026-07-19T07:10:00Z" },
    encounters: [
      { id: "e3", date: "2026-07-18", type: "Admission", note: "ACL tear, right knee. Pre-op evaluation; surgical repair scheduled." },
    ],
    orders: [
      { id: "o3", kind: "Medication", detail: "Ibuprofen 400mg oral TID", state: "signed", by: "Dr. David Brown" },
      { id: "o4", kind: "Medication", detail: "Oxycodone 5mg oral Q6H PRN", state: "signed", by: "Dr. David Brown" },
    ] },

  { id: "MRN-1003", email: "lucas.bennett@healthsphere.com", mrn: "MRN-1003", name: "Lucas Bennett",
    dob: "1978-11-05", sex: "Male", ward: "General Ward", service: "Neurology",
    attending: "Dr. Sarah Johnson", careTeam: ["sarah.johnson@healthsphere.com", "james.porter@healthsphere.com"],
    status: "guarded", allergies: ["Codeine"],
    vitals: { hr: 76, bp: "126/82", rr: 16, temp: 36.9, spo2: 98, at: "2026-07-19T07:25:00Z" },
    encounters: [
      { id: "e4", date: "2026-07-16", type: "Admission", note: "Focal-onset epilepsy and migraine with aura. Seizure precautions." },
      { id: "e5", date: "2026-07-18", type: "Neurology", note: "EEG monitoring; neurology consult follow-up." },
    ],
    orders: [
      { id: "o5", kind: "Medication", detail: "Levetiracetam 500mg oral BID", state: "signed", by: "Dr. Sarah Johnson" },
      { id: "o6", kind: "Medication", detail: "Sumatriptan 50mg oral PRN", state: "signed", by: "Dr. Sarah Johnson" },
    ] },

  { id: "MRN-1004", email: "grace.whitmore@healthsphere.com", mrn: "MRN-1004", name: "Grace Whitmore",
    dob: "1968-01-30", sex: "Female", ward: "General Ward", service: "Cardiology",
    attending: "Dr. Emma Davis", careTeam: ["emma.davis@healthsphere.com", "lily.armstrong@healthsphere.com"],
    status: "critical", allergies: ["ACE Inhibitors"],
    vitals: { hr: 96, bp: "104/68", rr: 20, temp: 37.2, spo2: 94, at: "2026-07-19T07:50:00Z" },
    encounters: [
      { id: "e6", date: "2026-07-15", type: "Admission", note: "CHF NYHA Class III with type 2 diabetes. Fluid restriction, daily weights." },
      { id: "e7", date: "2026-07-18", type: "Cardiology", note: "Cardiology follow-up; diuresis ongoing." },
    ],
    orders: [
      { id: "o7", kind: "Medication", detail: "Metoprolol 50mg oral BID", state: "signed", by: "Dr. Emma Davis" },
      { id: "o8", kind: "Medication", detail: "Furosemide 40mg oral daily", state: "signed", by: "Dr. Emma Davis" },
      { id: "o9", kind: "Medication", detail: "Metformin 1000mg oral BID", state: "signed", by: "Dr. Emma Davis" },
    ] },
];

function clinicianFor(email) { return CLINICIANS[String(email).toLowerCase()] || { name: email }; }

function censusFor(user) {
  const email = String(user.email || "").toLowerCase();
  let list = PATIENTS;
  if (user.persona === "patient") {
    list = PATIENTS.filter((p) => p.email.toLowerCase() === email);
  } else if (user.persona === "nurse") {
    list = PATIENTS.filter((p) => p.careTeam.map((c) => c.toLowerCase()).includes(email));
  } else if (user.persona === "physician") {
    const me = clinicianFor(email).name;
    list = PATIENTS.filter((p) => p.attending === me);
  }
  return list.map((p) => ({
    id: p.id, mrn: p.mrn, name: p.name, ward: p.ward, service: p.service,
    attending: p.attending, status: p.status, hr: p.vitals.hr, bp: p.vitals.bp, spo2: p.vitals.spo2,
  }));
}
function patientById(id) { return PATIENTS.find((p) => p.id === id) || null; }

module.exports = { clinicianFor, censusFor, patientById };
