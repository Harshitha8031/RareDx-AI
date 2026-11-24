# RareDx AI — Multi-Agent MDT Clinical Decision Support & Research Website

> **Multi-Agent Multi-Disciplinary Team (MDT) Simulation for Rare Disease Diagnostic Odyssey**  
> Final Year Bachelor of Engineering Project in Computer Science & Engineering (Data Science)  
> **ATME College of Engineering**, Mysuru — affiliated with **Visvesvaraya Technological University (VTU)**, Belagavi.

---

## 👥 Project Team & Guidance
- **Harshitha G** (USN: `4AD23CD058`) — CSE (Data Science)
- **Mohan Kumar N** (USN: `4AD23CD030`) — CSE (Data Science)
- **Nithin N** (USN: `4AD23CD033`) — CSE (Data Science)
- **Mrs. Madhu Nagaraj**, Assistant Professor (Project Guide)

---

## 🚀 How to Open and View the Website

You can view the website in two ways:

### Option 1: Instant Browser Launch (Recommended)
Simply double-click:
`C:\Users\HP\Downloads\harshitrha\index.html`  
It will open directly in Google Chrome, Microsoft Edge, or any modern web browser. All data and styles are bundled for 100% offline support.

### Option 2: Run Local Web Server
Double-click:
`C:\Users\HP\Downloads\harshitrha\start_website.bat`  
This launches a local web server at `http://localhost:8080` and opens your default browser.

---

## 🌟 Key Features of the Website

### 1. Dual Experience Modes (Toggle in Top Navbar)
- **Clinical Web Application Mode**: An interactive simulation of the complete 11-page RareDx AI clinical software platform.
- **Academic Showcase & Thesis Mode**: A research project presentation presenting the academic motivations, 5-stage methodology, algorithms, UN SDG mapping, evaluation metrics, and screenshot gallery.

### 2. Clinical Web Application Capabilities
- **Dashboard**: System health status indicators (API Server, PostgreSQL 16, LLaMA 3, ChromaDB), 4 key performance metrics, and previous clinical case audit log.
- **New Case Intake**:
  - Patient demographics (onset age, progression, family history).
  - Quick benchmark presets (Krabbe Disease, Wilson Disease, Gaucher Disease, Fabry Disease).
  - **Live NLP Entity Extraction**: Real-time parsing of free-text clinical notes with 3-token negation filtering (`no`, `not`, `denies`, `negative for`), synonym mapping (`fits` → `seizures`), and temporal onset extraction.
  - Hierarchical Symptom Selector covering 58 clinical phenotypes across 8 body systems with official HPO codes.
- **Multi-Agent MDT Analysis Pipeline**:
  - Live animated simulation of the 6 specialist AI agents:
    1. **General Physician Agent** (1.0× Weight)
    2. **Neurologist Agent** (1.2× Weight)
    3. **Geneticist Agent** (1.5× Weight)
    4. **Radiologist Agent** (1.1× Weight)
    5. **Immunologist Agent** (1.2× Weight)
    6. **Meta-Agent Arbitrator** (1.3× Weight)
  - Two-round consensus evaluation (threshold ≥ 60%) and arbitration.
  - Weighted Decision Fusion Engine mathematical scoring.
- **Diagnostic Review & Report**:
  - Primary diagnosis hero banner with confidence percentage.
  - Top-5 differential diagnoses comparison bars.
  - Recommended confirmatory diagnostic clinical test panels.
  - Full specialist debate transcripts.
  - Clinician approval & feedback recording.
  - Printable Diagnostic Analysis Report (styled identically to the official clinical PDF).
- **Case History**: Searchable registry of analyzed patient cases.
- **AI Specialist Agents Monitoring**: Detailed profiles, historical accuracy, weights, and reasoning focus for all 6 agents.
- **Knowledge Base Explorer**: 30 curated Orphanet rare disease profiles, 42,549 HPO terms, and NCBI PubMed publications with direct external links.
- **Diagnostics Analytics**: Evaluation charts and comparison tables against single-model AI.

### 3. Academic Showcase & Thesis Hub
- Comprehensive overview of the 4–7 year **Diagnostic Odyssey**.
- 5-Stage System Architecture flowchart.
- Mathematical formulations of Algorithms 1, 2, and 3.
- Evaluation on 50 synthetic scenarios demonstrating **87.2% Top-5 diagnostic accuracy**.
- UN Sustainable Development Goals (SDG 3, 4, 9) and Program Outcomes (PO1–PO11) mapping.
- **Interactive Lightbox Screenshot Gallery**: High-resolution walkthrough of all 15 system views.
- **Direct PDF Hub**: One-click download/view links to:
  - `RareDx_AI_Project_Report.pdf` (Full 71-page VTU thesis report)
  - `diseases report.pdf` (Sample Diagnostic Analysis Report for Case 1)

---

## 📁 Directory Structure
```
harshitrha/
├── index.html                               # Master Interactive Website
├── start_website.bat                        # One-click launcher script
├── README.md                                # Project documentation
├── RareDx_AI_Project_Report.pdf             # Full 71-Page VTU Thesis Report
├── diseases report.pdf                      # Official Sample Clinical Report PDF
└── assets/
    ├── css/
    │   └── style.css                        # Modern biotech dark theme stylesheet
    ├── js/
    │   ├── data.js                          # Bundled offline dataset (30 diseases, 58 symptoms)
    │   └── app.js                           # Interactive simulation & decision fusion engine
    ├── data/
    │   ├── diseases.json                    # 30 Curated Orphanet disease profiles
    │   ├── symptoms.json                    # 58 Phenotypes across 8 categories with HPO
    │   └── presets.json                     # Benchmark test cases
    ├── screenshots/                         # 15 Organized high-resolution screenshots
    └── report/                              # Rendered Diagnostic Report pages
```
