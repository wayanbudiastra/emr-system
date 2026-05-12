import { NextRequest, NextResponse } from 'next/server';

// Subset ICD-10 codes — penyakit umum di klinik Indonesia
const ICD10_DATA: { kode: string; deskripsi: string }[] = [
  // Infeksi & Parasit
  { kode: 'A00',   deskripsi: 'Cholera' },
  { kode: 'A01.0', deskripsi: 'Typhoid fever' },
  { kode: 'A09',   deskripsi: 'Other and unspecified gastroenteritis and colitis of infectious origin' },
  { kode: 'A15',   deskripsi: 'Respiratory tuberculosis' },
  { kode: 'A16',   deskripsi: 'Respiratory tuberculosis, not confirmed bacteriologically or histologically' },
  { kode: 'A90',   deskripsi: 'Dengue fever (classical dengue)' },
  { kode: 'A91',   deskripsi: 'Dengue haemorrhagic fever' },
  { kode: 'B02',   deskripsi: 'Zoster (herpes zoster)' },
  { kode: 'B34.9', deskripsi: 'Viral infection, unspecified' },
  { kode: 'B35.1', deskripsi: 'Tinea unguium (onychomycosis)' },
  { kode: 'B37.0', deskripsi: 'Candidal stomatitis (oral thrush)' },
  { kode: 'B82.9', deskripsi: 'Intestinal parasitism, unspecified' },

  // Neoplasma
  { kode: 'C34',   deskripsi: 'Malignant neoplasm of bronchus and lung' },
  { kode: 'C50',   deskripsi: 'Malignant neoplasm of breast' },
  { kode: 'D25',   deskripsi: 'Leiomyoma of uterus (uterine fibroids)' },

  // Darah & Imunitas
  { kode: 'D50',   deskripsi: 'Iron deficiency anaemia' },
  { kode: 'D64',   deskripsi: 'Other anaemias' },

  // Endokrin & Metabolisme
  { kode: 'E10',   deskripsi: 'Type 1 diabetes mellitus' },
  { kode: 'E11',   deskripsi: 'Type 2 diabetes mellitus' },
  { kode: 'E11.0', deskripsi: 'Type 2 diabetes mellitus with hyperosmolarity' },
  { kode: 'E11.4', deskripsi: 'Type 2 diabetes mellitus with diabetic neuropathy' },
  { kode: 'E11.5', deskripsi: 'Type 2 diabetes mellitus with diabetic peripheral angiopathy' },
  { kode: 'E14',   deskripsi: 'Unspecified diabetes mellitus' },
  { kode: 'E27.4', deskripsi: 'Other and unspecified adrenocortical insufficiency' },
  { kode: 'E66',   deskripsi: 'Obesity' },
  { kode: 'E78.0', deskripsi: 'Pure hypercholesterolaemia' },
  { kode: 'E78.5', deskripsi: 'Hyperlipidaemia, unspecified' },

  // Mental & Perilaku
  { kode: 'F32',   deskripsi: 'Depressive episode' },
  { kode: 'F41.1', deskripsi: 'Generalised anxiety disorder' },
  { kode: 'F43.1', deskripsi: 'Post-traumatic stress disorder' },

  // Saraf
  { kode: 'G43',   deskripsi: 'Migraine' },
  { kode: 'G44',   deskripsi: 'Other headache syndromes' },
  { kode: 'G54.2', deskripsi: 'Cervical root disorders, not elsewhere classified' },
  { kode: 'G62.9', deskripsi: 'Polyneuropathy, unspecified' },

  // Mata
  { kode: 'H10',   deskripsi: 'Conjunctivitis' },
  { kode: 'H25',   deskripsi: 'Senile cataract' },
  { kode: 'H52',   deskripsi: 'Disorders of refraction and accommodation' },

  // Telinga
  { kode: 'H65',   deskripsi: 'Nonsuppurative otitis media' },
  { kode: 'H66',   deskripsi: 'Suppurative and unspecified otitis media' },
  { kode: 'H81',   deskripsi: 'Disorders of vestibular function (vertigo)' },

  // Jantung & Pembuluh Darah
  { kode: 'I10',   deskripsi: 'Essential (primary) hypertension' },
  { kode: 'I11',   deskripsi: 'Hypertensive heart disease' },
  { kode: 'I20',   deskripsi: 'Angina pectoris' },
  { kode: 'I21',   deskripsi: 'Acute myocardial infarction' },
  { kode: 'I25',   deskripsi: 'Chronic ischaemic heart disease' },
  { kode: 'I50',   deskripsi: 'Heart failure' },
  { kode: 'I63',   deskripsi: 'Cerebral infarction (stroke)' },
  { kode: 'I64',   deskripsi: 'Stroke, not specified as haemorrhage or infarction' },

  // Saluran Napas
  { kode: 'J00',   deskripsi: 'Acute nasopharyngitis (common cold)' },
  { kode: 'J01',   deskripsi: 'Acute sinusitis' },
  { kode: 'J02',   deskripsi: 'Acute pharyngitis' },
  { kode: 'J03',   deskripsi: 'Acute tonsillitis' },
  { kode: 'J04',   deskripsi: 'Acute laryngitis and tracheitis' },
  { kode: 'J06.9', deskripsi: 'Acute upper respiratory infection, unspecified' },
  { kode: 'J11',   deskripsi: 'Influenza, virus not identified' },
  { kode: 'J18',   deskripsi: 'Pneumonia, unspecified organism' },
  { kode: 'J20',   deskripsi: 'Acute bronchitis' },
  { kode: 'J30',   deskripsi: 'Vasomotor and allergic rhinitis' },
  { kode: 'J40',   deskripsi: 'Bronchitis, not specified as acute or chronic' },
  { kode: 'J45',   deskripsi: 'Asthma' },
  { kode: 'J45.0', deskripsi: 'Predominantly allergic asthma' },
  { kode: 'J45.1', deskripsi: 'Nonallergic asthma' },
  { kode: 'J45.9', deskripsi: 'Asthma, unspecified' },
  { kode: 'J46',   deskripsi: 'Status asthmaticus' },

  // Pencernaan
  { kode: 'K02',   deskripsi: 'Dental caries' },
  { kode: 'K05',   deskripsi: 'Gingivitis and periodontal diseases' },
  { kode: 'K21',   deskripsi: 'Gastro-oesophageal reflux disease (GERD)' },
  { kode: 'K25',   deskripsi: 'Gastric ulcer' },
  { kode: 'K26',   deskripsi: 'Duodenal ulcer' },
  { kode: 'K29',   deskripsi: 'Gastritis and duodenitis' },
  { kode: 'K30',   deskripsi: 'Functional dyspepsia' },
  { kode: 'K35',   deskripsi: 'Acute appendicitis' },
  { kode: 'K57',   deskripsi: 'Diverticular disease of intestine' },
  { kode: 'K58',   deskripsi: 'Irritable bowel syndrome' },
  { kode: 'K70',   deskripsi: 'Alcoholic liver disease' },
  { kode: 'K74',   deskripsi: 'Fibrosis and cirrhosis of liver' },
  { kode: 'K80',   deskripsi: 'Cholelithiasis (gallstones)' },
  { kode: 'K92.1', deskripsi: 'Melaena (gastrointestinal bleeding)' },

  // Kulit
  { kode: 'L02',   deskripsi: 'Cutaneous abscess, furuncle and carbuncle' },
  { kode: 'L03',   deskripsi: 'Cellulitis' },
  { kode: 'L20',   deskripsi: 'Atopic dermatitis' },
  { kode: 'L23',   deskripsi: 'Allergic contact dermatitis' },
  { kode: 'L29',   deskripsi: 'Pruritus' },
  { kode: 'L30',   deskripsi: 'Other and unspecified dermatitis' },
  { kode: 'L40',   deskripsi: 'Psoriasis' },
  { kode: 'L50',   deskripsi: 'Urticaria (hives)' },
  { kode: 'L70',   deskripsi: 'Acne' },
  { kode: 'L73.9', deskripsi: 'Follicular disorder, unspecified' },

  // Muskuloskeletal & Jaringan Ikat
  { kode: 'M05',   deskripsi: 'Rheumatoid arthritis with rheumatoid factor' },
  { kode: 'M10',   deskripsi: 'Gout' },
  { kode: 'M16',   deskripsi: 'Coxarthrosis (arthrosis of hip)' },
  { kode: 'M17',   deskripsi: 'Gonarthrosis (arthrosis of knee)' },
  { kode: 'M47',   deskripsi: 'Spondylosis' },
  { kode: 'M51',   deskripsi: 'Intervertebral disc disorders' },
  { kode: 'M54',   deskripsi: 'Dorsalgia (back pain)' },
  { kode: 'M54.5', deskripsi: 'Low back pain' },
  { kode: 'M54.4', deskripsi: 'Lumbago with sciatica' },
  { kode: 'M62.5', deskripsi: 'Muscle wasting and atrophy' },
  { kode: 'M79.3', deskripsi: 'Panniculitis' },

  // Urogenital
  { kode: 'N10',   deskripsi: 'Acute pyelonephritis' },
  { kode: 'N18',   deskripsi: 'Chronic kidney disease' },
  { kode: 'N20',   deskripsi: 'Calculus of kidney (kidney stones)' },
  { kode: 'N30',   deskripsi: 'Cystitis' },
  { kode: 'N39.0', deskripsi: 'Urinary tract infection, site not specified' },
  { kode: 'N40',   deskripsi: 'Benign prostatic hyperplasia (BPH)' },

  // Kehamilan & Persalinan
  { kode: 'O20.0', deskripsi: 'Threatened abortion' },
  { kode: 'O26.0', deskripsi: 'Low weight gain in pregnancy' },
  { kode: 'O80',   deskripsi: 'Encounter for full-term uncomplicated delivery' },

  // Gejala & Tanda Tidak Spesifik
  { kode: 'R00',   deskripsi: 'Abnormalities of heart beat' },
  { kode: 'R05',   deskripsi: 'Cough' },
  { kode: 'R06.0', deskripsi: 'Dyspnoea (shortness of breath)' },
  { kode: 'R07',   deskripsi: 'Pain in throat and chest' },
  { kode: 'R10',   deskripsi: 'Abdominal and pelvic pain' },
  { kode: 'R11',   deskripsi: 'Nausea and vomiting' },
  { kode: 'R50',   deskripsi: 'Fever of other and unknown origin' },
  { kode: 'R51',   deskripsi: 'Headache' },
  { kode: 'R53',   deskripsi: 'Malaise and fatigue' },
  { kode: 'R55',   deskripsi: 'Syncope and collapse (fainting)' },
  { kode: 'R73.0', deskripsi: 'Impaired fasting glucose' },
  { kode: 'R73.09', deskripsi: 'Pre-diabetes' },

  // Cedera & Luka
  { kode: 'S00',   deskripsi: 'Superficial injury of head' },
  { kode: 'S09.9', deskripsi: 'Unspecified injury of head' },
  { kode: 'S60',   deskripsi: 'Superficial injury of wrist and hand' },
  { kode: 'S80',   deskripsi: 'Superficial injury of knee and lower leg' },
  { kode: 'T14.0', deskripsi: 'Open wound of unspecified body region' },
  { kode: 'T14.9', deskripsi: 'Injury, unspecified' },
  { kode: 'T78.1', deskripsi: 'Other adverse food reactions' },
  { kode: 'T78.4', deskripsi: 'Allergy, unspecified' },

  // Kontak & Pemeriksaan
  { kode: 'Z00.0', deskripsi: 'General examination without complaint (check-up)' },
  { kode: 'Z00.1', deskripsi: 'Routine child health examination' },
  { kode: 'Z08',   deskripsi: 'Follow-up examination after treatment for malignant neoplasms' },
  { kode: 'Z23',   deskripsi: 'Encounter for immunization' },
  { kode: 'Z25',   deskripsi: 'Encounter for prophylactic vaccination' },
  { kode: 'Z87.1', deskripsi: 'Personal history of diseases of the digestive system' },
];

export async function GET(req: NextRequest) {
  const q = new URL(req.url).searchParams.get('q')?.toLowerCase().trim() ?? '';

  if (!q || q.length < 2) {
    return NextResponse.json([]);
  }

  const results = ICD10_DATA.filter(
    item =>
      item.kode.toLowerCase().includes(q) ||
      item.deskripsi.toLowerCase().includes(q)
  ).slice(0, 15);

  return NextResponse.json(results);
}
