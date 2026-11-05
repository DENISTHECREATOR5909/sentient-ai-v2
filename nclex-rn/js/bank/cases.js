/* ============================================================
   Next Generation NCLEX unfolding case studies.
   Each case delivers six linked items that follow the NCSBN
   Clinical Judgment Measurement Model:
     recognize cues -> analyze cues -> prioritize hypotheses ->
     generate solutions -> take action -> evaluate outcomes
   ============================================================ */
window.NCLEX_CASES = [

/* ------------------------------------------------------------------ */
{
 id:'CASE-SEPSIS',
 title:'Urosepsis in an older adult',
 scenario:'A 78-year-old client is brought to the emergency department by their daughter, who reports that the client has been "not acting right" since yesterday and has had burning with urination for 3 days. The client has a history of type 2 diabetes and benign prostatic hyperplasia.',
 record:[
  {tab:'Nurses\' Notes',text:'1400. Client is drowsy but arousable, oriented to person only. Daughter states the client was fully oriented two days ago. Skin warm and flushed. Reports suprapubic tenderness. Voided 60 mL of cloudy, foul-smelling urine since arrival 3 hours ago. Capillary refill 4 seconds.'},
  {tab:'Vital Signs',rows:[['Temperature','38.9 C (102.0 F)'],['Heart rate','122/min'],['Respiratory rate','26/min'],['Blood pressure','88/48 mm Hg'],['Oxygen saturation','93% on room air'],['Pain','4 of 10 suprapubic']]},
  {tab:'Laboratory Results',rows:[['White blood cells','19,400/mm3'],['Lactate','4.1 mmol/L'],['Serum creatinine','2.1 mg/dL (baseline 1.0)'],['Blood glucose','268 mg/dL'],['Urinalysis','Large leukocyte esterase, positive nitrites, many bacteria']]}
 ],
 items:[
  {id:'CASE-SEPSIS-1',cat:'RRP',b:-0.3,type:'highlight',step:'Recognize cues',
   stem:'Highlight the findings that require immediate follow-up.',
   instr:'Tap each finding that requires immediate follow-up. Tap again to remove a highlight.',
   segments:['Client is drowsy and oriented to person only, a change from baseline.',
             'Reports burning with urination for 3 days.',
             'Blood pressure is 88/48 mm Hg with a heart rate of 122/min.',
             'Temperature is 38.9 C.',
             'Serum lactate is 4.1 mmol/L.',
             'Pain is rated 4 of 10 in the suprapubic area.',
             'Urine output is 60 mL over 3 hours.'],
   answer:[0,2,3,4,6],
   rationale:'Acute change in mental status, hypotension with tachycardia, fever, an elevated lactate indicating tissue hypoperfusion, and oliguria of about 20 mL/hour all point to sepsis with organ dysfunction and require immediate action. Dysuria and moderate suprapubic pain are important history but are not the emergent findings.'},

  {id:'CASE-SEPSIS-2',cat:'PHY',b:0.2,type:'matrix',step:'Analyze cues',
   stem:'For each finding, indicate the body system it reflects.',
   rowHeader:'Finding',
   rows:['New disorientation and drowsiness','Blood pressure 88/48 mm Hg','Urine output 20 mL/hour','Respiratory rate 26/min'],
   cols:['Neurologic','Cardiovascular','Renal','Respiratory'],
   answer:[0,1,2,3],
   rationale:'Sepsis produces dysfunction across multiple systems at once. Encephalopathy is neurologic, hypotension from vasodilation is cardiovascular, oliguria from hypoperfusion is renal, and compensatory tachypnea for metabolic acidosis is respiratory. Recognizing multi-system involvement is what distinguishes sepsis from a simple urinary tract infection.'},

  {id:'CASE-SEPSIS-3',cat:'PHY',b:0.6,type:'cloze',step:'Prioritize hypotheses',
   stem:'Complete the sentence about the client\'s most likely condition.',
   text:'The client is most likely experiencing {0} as a result of {1}. The client is at greatest immediate risk for {2}.',
   blanks:[
    {options:['sepsis with organ dysfunction','a simple lower urinary tract infection','hypoglycemia','an acute stroke'],answer:0},
    {options:['a urinary tract source of infection','a myocardial infarction','a pulmonary embolism','an adverse medication reaction'],answer:0},
    {options:['septic shock with multiorgan failure','deep vein thrombosis','hyperkalemia from dehydration','an aspiration event'],answer:0}],
   rationale:'Infection plus new organ dysfunction, shown by encephalopathy, hypotension, oliguria, a rising creatinine, and a lactate above 4 mmol/L, defines sepsis rather than an uncomplicated urinary tract infection. The urinalysis identifies the source. Without rapid treatment the client will progress to septic shock and multiorgan failure.'},

  {id:'CASE-SEPSIS-4',cat:'MOC',b:0.9,type:'sata',step:'Generate solutions',
   stem:'Which interventions should the nurse anticipate within the first hour? Select all that apply.',
   options:['Obtain blood cultures before starting antibiotics',
            'Administer broad-spectrum intravenous antibiotics',
            'Begin a 30 mL/kg crystalloid fluid bolus',
            'Withhold fluids because of the elevated creatinine',
            'Measure serum lactate and remeasure after treatment',
            'Administer an oral antipyretic and reassess in 4 hours'],
   answer:[0,1,2,4],
   rationale:'The sepsis bundle calls for cultures before antibiotics, early broad-spectrum antibiotics, a 30 mL/kg crystalloid bolus for hypotension or a lactate of 4 mmol/L or greater, and serial lactate measurement. The elevated creatinine reflects hypoperfusion, so fluids are the treatment, not a contraindication. Waiting 4 hours is unacceptable in sepsis.'},

  {id:'CASE-SEPSIS-5',cat:'PHA',b:1.2,type:'ordered',step:'Take action',
   stem:'Place the nurse\'s actions in the order they should be performed.',
   options:['Establish two large-bore intravenous catheters',
            'Draw blood cultures from two sites',
            'Begin the prescribed crystalloid fluid bolus',
            'Administer the prescribed broad-spectrum antibiotic',
            'Reassess blood pressure, mental status, and urine output'],
   rationale:'Vascular access must come first so that everything else is possible. Cultures are drawn next, because obtaining them after antibiotics reduces the chance of identifying the organism, but this must not delay treatment. Fluids and antibiotics follow immediately, and reassessment closes the loop.'},

  {id:'CASE-SEPSIS-6',cat:'RRP',b:1.0,type:'matrix',step:'Evaluate outcomes',
   scenario:'Four hours after the interventions were started, the nurse reassesses the client.',
   record:[{tab:'Reassessment at 1800',rows:[['Temperature','37.6 C'],['Heart rate','96/min'],['Blood pressure','112/68 mm Hg'],['Respiratory rate','20/min'],['Urine output','45 mL/hour over the last 2 hours'],['Lactate','1.9 mmol/L'],['Mental status','Oriented to person, place, and time']]}],
   stem:'Indicate whether each finding shows that the client\'s condition has improved, has not changed, or has worsened.',
   rowHeader:'Finding',
   rows:['Blood pressure 112/68 mm Hg','Lactate 1.9 mmol/L','Urine output 45 mL/hour','Oriented to person, place, and time','Heart rate 96/min'],
   cols:['Improved','Unchanged','Worsened'],
   answer:[0,0,0,0,0],
   rationale:'Every parameter has moved toward normal: perfusion pressure is restored, the lactate has cleared below 2 mmol/L indicating resolved tissue hypoperfusion, urine output exceeds 0.5 mL/kg/hour, mental status has returned to baseline, and the compensatory tachycardia has resolved. Together these indicate an effective response to fluid resuscitation and antibiotics.'}
 ]
},

/* ------------------------------------------------------------------ */
{
 id:'CASE-HF',
 title:'Acute heart failure exacerbation',
 scenario:'A 72-year-old client with a history of heart failure with reduced ejection fraction, hypertension, and chronic kidney disease stage 3 arrives at the clinic reporting increasing shortness of breath over 4 days and being unable to sleep flat.',
 record:[
  {tab:'Nurses\' Notes',text:'0900. Client reports sleeping in a recliner for the past three nights and using three pillows before that. Reports a 3 kg weight gain since last week and states shoes no longer fit. Admits to eating canned soup and deli meats daily since a family member has been ill. Denies chest pain.'},
  {tab:'Vital Signs',rows:[['Temperature','36.8 C'],['Heart rate','104/min, irregular'],['Respiratory rate','26/min'],['Blood pressure','158/94 mm Hg'],['Oxygen saturation','89% on room air'],['Weight','84 kg (81 kg last week)']]},
  {tab:'Assessment',rows:[['Lungs','Crackles to mid-posterior fields bilaterally'],['Heart','S3 gallop present'],['Neck','Jugular venous distention at 45 degrees'],['Extremities','3+ pitting edema to mid-calf bilaterally'],['Skin','Cool, slightly diaphoretic']]},
  {tab:'Laboratory Results',rows:[['B-type natriuretic peptide','1840 pg/mL'],['Serum sodium','132 mEq/L'],['Serum potassium','3.9 mEq/L'],['Serum creatinine','1.9 mg/dL'],['Troponin','Within normal limits']]}
 ],
 items:[
  {id:'CASE-HF-1',cat:'RRP',b:-0.5,type:'sata',step:'Recognize cues',
   stem:'Which findings are consistent with worsening fluid volume overload? Select all that apply.',
   options:['3 kg weight gain in one week','Jugular venous distention at 45 degrees','Bilateral crackles to the mid-posterior fields','Troponin within normal limits','3+ pitting edema of the lower extremities','Orthopnea requiring the client to sleep in a recliner'],
   answer:[0,1,2,4,5],
   rationale:'Rapid weight gain, jugular venous distention, crackles, dependent edema, and orthopnea are the classic signs of congestion from volume overload. A normal troponin is a reassuring finding that argues against acute myocardial infarction as the precipitant.'},

  {id:'CASE-HF-2',cat:'PHY',b:0.3,type:'matrix',step:'Analyze cues',
   stem:'Indicate whether each finding reflects left-sided failure, right-sided failure, or both.',
   rowHeader:'Finding',
   rows:['Bilateral crackles and orthopnea','Jugular venous distention','3+ pitting ankle edema','Oxygen saturation 89% on room air'],
   cols:['Left-sided','Right-sided','Both'],
   answer:[0,1,1,0],
   rationale:'Left ventricular failure backs blood up into the pulmonary circulation, producing crackles, orthopnea, and hypoxemia. Right ventricular failure backs blood into the systemic venous circulation, producing jugular venous distention and dependent edema. This client shows both, which is typical in chronic heart failure.'},

  {id:'CASE-HF-3',cat:'PHY',b:0.7,type:'bowtie',step:'Prioritize hypotheses',
   stem:'Complete the diagram for this client.',
   instr:'Select the condition the client is most likely experiencing, two actions to take now, and two parameters to monitor.',
   slots:{actions:2,params:2},
   labels:{actions:'Actions to take',condition:'Condition most likely experiencing',params:'Parameters to monitor'},
   actions:['Place in high Fowler position and apply supplemental oxygen',
            'Administer the prescribed intravenous loop diuretic',
            'Administer a 500 mL normal saline bolus',
            'Encourage the client to increase sodium intake for appetite',
            'Place the client supine to reduce cardiac workload'],
   conditions:['Acute decompensated heart failure','Pneumonia','Acute myocardial infarction','Pulmonary embolism'],
   params:['Daily weight and strict intake and output','Oxygen saturation and work of breathing','Serum amylase','Deep tendon reflexes'],
   answer:{actions:[0,1],condition:0,params:[0,1]},
   rationale:'The combination of congestion, an S3 gallop, a markedly elevated B-type natriuretic peptide, and a normal troponin identifies acute decompensated heart failure rather than infarction, pneumonia, or embolism. Upright positioning with oxygen relieves the work of breathing immediately, and a loop diuretic removes excess volume. Daily weight with intake and output and continuous assessment of oxygenation are the parameters that show whether treatment is working.'},

  {id:'CASE-HF-4',cat:'MOC',b:0.85,type:'dragdrop',step:'Generate solutions',
   stem:'Sort each nursing intervention according to whether it should be included in or excluded from this client\'s plan of care.',
   tokens:['Restrict sodium to the prescribed limit',
           'Weigh the client daily at the same time on the same scale',
           'Encourage 3 liters of fluid per day',
           'Monitor serum potassium during diuretic therapy',
           'Keep the client on strict bed rest indefinitely',
           'Teach the client to report a weight gain of more than 1 kg in a day'],
   buckets:['Include in the plan','Exclude from the plan'],
   answer:[0,0,1,0,1,0],
   rationale:'Sodium restriction, daily weights, potassium monitoring during loop diuretic therapy, and teaching about weight-gain thresholds are core heart failure interventions. Encouraging 3 liters of fluid would worsen congestion, and indefinite bed rest causes deconditioning and thromboembolism; activity is graded to tolerance instead.'},

  {id:'CASE-HF-5',cat:'PHA',b:1.15,type:'mc',step:'Take action',
   scenario:'The practitioner prescribes furosemide 40 mg intravenously now.',
   stem:'Which action should the nurse take before administering the medication?',
   options:['Verify the most recent serum potassium and creatinine and assess the blood pressure',
            'Have the client drink 500 mL of water to protect the kidneys',
            'Hold the dose until the morning laboratory results are drawn',
            'Administer the dose rapidly by intravenous push over 10 seconds'],
   answer:0,
   rationale:'Loop diuretics deplete potassium and can worsen renal function and cause hypotension, so recent electrolytes, renal function, and blood pressure are checked first. Intravenous furosemide is given slowly, generally no faster than 20 mg per minute, because rapid administration risks ototoxicity. Delaying treatment in a hypoxemic client with pulmonary congestion is unsafe.'},

  {id:'CASE-HF-6',cat:'RRP',b:0.95,type:'cloze',step:'Evaluate outcomes',
   scenario:'Twelve hours after treatment began, the nurse reassesses the client: weight 81.5 kg, urine output 2100 mL, oxygen saturation 95% on room air, crackles now only at the bases, and the client is able to lie at 30 degrees without dyspnea.',
   stem:'Complete the evaluation statement.',
   text:'The client\'s response to therapy indicates that the treatment has been {0}. The nurse should now prioritize monitoring for {1}.',
   blanks:[
    {options:['effective','ineffective','unchanged','harmful'],answer:0},
    {options:['hypokalemia and dehydration from ongoing diuresis','worsening pulmonary congestion','hypertensive crisis','hyperkalemia from fluid retention'],answer:0}],
   rationale:'Weight loss of 2.5 kg matched by a 2100 mL diuresis, improved oxygenation, reduced crackles, and relieved orthopnea all confirm an effective response. The next risk is overshooting: continued loop diuresis causes potassium loss and volume depletion, so potassium levels, renal function, and orthostatic blood pressures are monitored.'}
 ]
},

/* ------------------------------------------------------------------ */
{
 id:'CASE-PREE',
 title:'Preeclampsia with severe features',
 scenario:'A 29-year-old client at 35 weeks gestation presents to the obstetric triage unit reporting a headache that has not responded to acetaminophen, blurred vision, and pain "under my ribs on the right side." This is the client\'s first pregnancy.',
 record:[
  {tab:'Nurses\' Notes',text:'2130. Client reports swelling of the hands and face that began three days ago and worsened today. Rings no longer fit. Denies contractions. Reports good fetal movement. Deep tendon reflexes 4+ with two beats of clonus at the ankle.'},
  {tab:'Vital Signs',rows:[['Blood pressure','170/112 mm Hg, repeated 166/108 mm Hg'],['Heart rate','96/min'],['Respiratory rate','18/min'],['Temperature','36.9 C'],['Fetal heart rate','142/min, moderate variability, no decelerations']]},
  {tab:'Laboratory Results',rows:[['Platelets','88,000/mm3'],['Aspartate aminotransferase','142 units/L'],['Alanine aminotransferase','128 units/L'],['Serum creatinine','1.3 mg/dL'],['Urine protein/creatinine ratio','0.6 (elevated)']]}
 ],
 items:[
  {id:'CASE-PREE-1',cat:'HPM',b:0.1,type:'highlight',step:'Recognize cues',
   stem:'Highlight each finding that indicates preeclampsia with severe features.',
   instr:'Tap each finding indicating severe features. Tap again to remove a highlight.',
   segments:['Blood pressure 170/112 mm Hg on repeat measurement.',
             'Headache unrelieved by acetaminophen with blurred vision.',
             'Right upper quadrant pain.',
             'Fetal heart rate 142/min with moderate variability.',
             'Platelet count 88,000/mm3.',
             'Aspartate aminotransferase 142 units/L.',
             'Swelling of the hands and face.'],
   answer:[0,1,2,4,5],
   rationale:'Severe features include systolic pressure of 160 mm Hg or higher or diastolic of 110 mm Hg or higher, new cerebral or visual symptoms, right upper quadrant or epigastric pain from hepatic capsule stretch, thrombocytopenia below 100,000/mm3, and transaminases at twice normal. Edema is common in pregnancy and is not itself a severe feature, and the fetal heart tracing is reassuring.'},

  {id:'CASE-PREE-2',cat:'PHY',b:0.55,type:'cloze',step:'Analyze cues',
   stem:'Complete the sentence about the client\'s condition.',
   text:'The combination of thrombocytopenia, elevated liver enzymes, and right upper quadrant pain suggests that the client is developing {0}. The 4+ deep tendon reflexes with clonus indicate that the client is at immediate risk for {1}.',
   blanks:[
    {options:['HELLP syndrome','gestational diabetes','placenta previa','hyperemesis gravidarum'],answer:0},
    {options:['an eclamptic seizure','preterm labor','amniotic fluid embolism','gestational thrombocytopenia'],answer:0}],
   rationale:'Hemolysis, elevated liver enzymes, and low platelets define HELLP syndrome, a severe variant of preeclampsia. Central nervous system irritability shown by hyperreflexia and clonus signals impending eclampsia, which is why seizure prophylaxis is urgent.'},

  {id:'CASE-PREE-3',cat:'MOC',b:0.75,type:'mc',step:'Prioritize hypotheses',
   stem:'Which finding is the nurse\'s highest priority concern at this moment?',
   options:['The client\'s facial and hand swelling',
            'The 4+ reflexes with clonus in the setting of a blood pressure of 170/112 mm Hg',
            'The client\'s report of good fetal movement',
            'The elevated serum creatinine of 1.3 mg/dL'],
   answer:1,
   rationale:'Severe-range hypertension with central nervous system hyperirritability puts the client at immediate risk of eclamptic seizure and hemorrhagic stroke, the leading causes of maternal death in preeclampsia. Renal involvement matters but is not the immediate threat, edema is nonspecific, and fetal movement is a reassuring finding.'},

  {id:'CASE-PREE-4',cat:'PHA',b:1.05,type:'sata',step:'Generate solutions',
   stem:'Which interventions should the nurse anticipate? Select all that apply.',
   options:['Initiate magnesium sulfate for seizure prophylaxis',
            'Administer a prescribed antihypertensive for severe-range blood pressure',
            'Place the client in a quiet room with minimal stimulation and seizure precautions',
            'Administer an intravenous fluid bolus of 2000 mL over 1 hour',
            'Prepare for possible delivery and administer corticosteroids for fetal lung maturity if indicated',
            'Encourage ambulation in the hallway to lower the blood pressure'],
   answer:[0,1,2,4],
   rationale:'Magnesium sulfate prevents eclamptic seizures, antihypertensives treat severe-range pressures to prevent stroke, a low-stimulation environment with seizure precautions reduces the seizure threshold risk, and delivery is the only definitive cure, with antenatal corticosteroids given before 37 weeks when time allows. Large fluid boluses risk pulmonary edema, and ambulation does not treat severe hypertension.'},

  {id:'CASE-PREE-5',cat:'PHA',b:1.3,type:'matrix',step:'Take action',
   scenario:'Magnesium sulfate is started with a 4 gram loading dose followed by a 2 gram per hour infusion.',
   stem:'Indicate whether each nursing action is indicated or contraindicated during the magnesium infusion.',
   rowHeader:'Nursing action',
   rows:['Assess deep tendon reflexes hourly',
         'Keep calcium gluconate immediately available',
         'Monitor hourly urine output, holding the infusion if output falls below 30 mL/hour',
         'Withhold continuous fetal monitoring to allow the client to rest',
         'Continue the infusion if the respiratory rate falls to 10/min'],
   cols:['Indicated','Contraindicated'],
   answer:[0,0,0,1,1],
   rationale:'Magnesium is renally cleared, so hourly reflexes, respiratory rate, and urine output detect accumulation, and calcium gluconate is the antidote kept at the bedside. Loss of reflexes and a respiratory rate below 12/min require stopping the infusion. Continuous fetal monitoring is maintained because magnesium and severe preeclampsia both affect the fetus.'},

  {id:'CASE-PREE-6',cat:'RRP',b:1.1,type:'matrix',step:'Evaluate outcomes',
   scenario:'Six hours after magnesium sulfate and antihypertensive therapy were started, the nurse reassesses the client.',
   record:[{tab:'Reassessment',rows:[['Blood pressure','142/88 mm Hg'],['Deep tendon reflexes','2+, no clonus'],['Respiratory rate','16/min'],['Urine output','40 mL/hour'],['Headache','Resolved'],['Platelets','76,000/mm3'],['Fetal heart rate','140/min, moderate variability']]}],
   stem:'Indicate whether each finding shows that the client has improved or has worsened.',
   rowHeader:'Finding',
   rows:['Blood pressure 142/88 mm Hg','Deep tendon reflexes 2+ without clonus','Headache resolved','Platelet count 76,000/mm3','Urine output 40 mL/hour'],
   cols:['Improved','Worsened'],
   answer:[0,0,0,1,0],
   rationale:'Blood pressure out of the severe range, normal reflexes without clonus, a resolved headache, and adequate urine output all show a therapeutic response and safe magnesium levels. The falling platelet count shows that HELLP syndrome is progressing despite treatment, which is an indication to proceed toward delivery.'}
 ]
},

/* ------------------------------------------------------------------ */
{
 id:'CASE-ASTHMA',
 title:'Pediatric asthma exacerbation',
 scenario:'A 7-year-old child is brought to the emergency department by a parent for worsening cough and wheezing that began after a visit to a home with cats. The child has a history of asthma and uses an albuterol inhaler as needed.',
 record:[
  {tab:'Nurses\' Notes',text:'1615. Child is sitting upright, leaning forward on the stretcher. Speaks in short phrases of three to four words. Audible wheezing on expiration. Suprasternal and intercostal retractions present. Parent reports using the rescue inhaler four times in the past 6 hours with little relief and states the child has been up all night coughing.'},
  {tab:'Vital Signs',rows:[['Temperature','37.1 C'],['Heart rate','142/min'],['Respiratory rate','38/min'],['Blood pressure','104/64 mm Hg'],['Oxygen saturation','90% on room air'],['Weight','24 kg'],['Peak expiratory flow','48% of personal best']]}
 ],
 items:[
  {id:'CASE-ASTHMA-1',cat:'RRP',b:-0.2,type:'sata',step:'Recognize cues',
   stem:'Which findings indicate a severe asthma exacerbation? Select all that apply.',
   options:['Speaking in short phrases of three to four words',
            'Suprasternal and intercostal retractions',
            'Peak expiratory flow of 48% of personal best',
            'Temperature of 37.1 C',
            'Oxygen saturation of 90% on room air',
            'Rescue inhaler used four times in 6 hours with little relief'],
   answer:[0,1,2,4,5],
   rationale:'Inability to speak full sentences, accessory muscle use with retractions, a peak flow between 40% and 69% of personal best, hypoxemia, and poor response to repeated rescue therapy all mark a moderate to severe exacerbation. The temperature is normal and does not indicate severity.'},

  {id:'CASE-ASTHMA-2',cat:'PHY',b:0.4,type:'cloze',step:'Analyze cues',
   stem:'Complete the sentences about the pathophysiology of the child\'s presentation.',
   text:'The child\'s wheezing and retractions are caused by {0}. If the wheezing were to suddenly disappear while the work of breathing increased, the nurse should interpret this as {1}.',
   blanks:[
    {options:['bronchoconstriction, airway inflammation, and mucus plugging','alveolar collapse from surfactant deficiency','fluid overload in the pulmonary capillaries','upper airway obstruction from epiglottitis'],answer:0},
    {options:['a sign of worsening obstruction with severely reduced air movement','evidence that the exacerbation has resolved','an expected response to albuterol','a normal finding in school-age children'],answer:0}],
   rationale:'Asthma involves reversible bronchoconstriction, airway wall inflammation, and mucus plugging. Wheezing requires airflow, so a silent chest in a child who is working harder to breathe signals critically reduced air movement and impending respiratory failure, not improvement.'},

  {id:'CASE-ASTHMA-3',cat:'MOC',b:0.65,type:'mc',step:'Prioritize hypotheses',
   stem:'Which nursing concern is the priority for this child?',
   options:['Anxiety related to the emergency department environment',
            'Impaired gas exchange related to airway obstruction',
            'Knowledge deficit related to trigger avoidance',
            'Activity intolerance related to fatigue'],
   answer:1,
   rationale:'Airway and breathing come first. Hypoxemia with severe work of breathing is the immediate threat to life. Anxiety, teaching needs, and activity tolerance are real but are addressed after oxygenation and ventilation are stabilized.'},

  {id:'CASE-ASTHMA-4',cat:'PHA',b:0.9,type:'sata',step:'Generate solutions',
   stem:'Which interventions should the nurse anticipate? Select all that apply.',
   options:['Administer oxygen to maintain saturation at or above 92%',
            'Give a nebulized short-acting beta-2 agonist, often with ipratropium',
            'Administer a systemic corticosteroid',
            'Administer a sedative to calm the child',
            'Keep the child upright and allow the parent to remain present',
            'Begin chest physiotherapy immediately'],
   answer:[0,1,2,4],
   rationale:'Oxygen, repeated or continuous short-acting bronchodilator with ipratropium, and early systemic corticosteroids are the mainstays of acute exacerbation care. Upright positioning and parental presence reduce distress and oxygen demand. Sedatives depress respiratory drive and are contraindicated, and chest physiotherapy is not indicated during an acute exacerbation.'},

  {id:'CASE-ASTHMA-5',cat:'PHA',b:1.25,type:'mc',step:'Take action',
   scenario:'The child receives continuous nebulized albuterol. Thirty minutes later the heart rate is 168/min and the child has a fine tremor.',
   stem:'What is the nurse\'s best action?',
   options:['Stop the albuterol immediately and notify the practitioner of an allergic reaction',
            'Continue the treatment while monitoring, since tachycardia and tremor are expected beta-agonist effects, and reassess the respiratory status',
            'Administer a beta-blocker to slow the heart rate',
            'Switch to an inhaled corticosteroid as the rescue medication'],
   answer:1,
   rationale:'Tachycardia, tremor, and mild hypokalemia are expected pharmacologic effects of beta-2 agonists rather than an allergic reaction, and the respiratory benefit outweighs them during a severe exacerbation. Beta-blockers cause bronchospasm and are contraindicated in asthma, and inhaled corticosteroids are controllers, not rescue medications.'},

  {id:'CASE-ASTHMA-6',cat:'HPM',b:0.8,type:'matrix',step:'Evaluate outcomes',
   scenario:'After 2 hours of treatment the child is reassessed before discharge planning.',
   record:[{tab:'Reassessment',rows:[['Respiratory rate','24/min'],['Oxygen saturation','96% on room air'],['Speech','Full sentences'],['Retractions','None'],['Peak expiratory flow','82% of personal best'],['Breath sounds','Scattered end-expiratory wheeze']]}],
   stem:'Indicate whether each statement by the parent shows correct understanding of the discharge teaching or requires further teaching.',
   rowHeader:'Parent statement',
   rows:['"I will give the oral steroid for the full number of days prescribed."',
         '"I will use the controller inhaler every day even when she feels well."',
         '"I will stop the rescue inhaler now that she is better and only use the controller."',
         '"I will bring her back if she cannot speak in full sentences or the rescue inhaler stops helping."',
         '"We will keep her away from the cats and use the peak flow meter to track her."'],
   cols:['Correct understanding','Requires further teaching'],
   answer:[0,0,1,0,0],
   rationale:'Completing the corticosteroid course, daily controller use, recognizing return-precaution red flags, and trigger avoidance with peak flow monitoring are all correct. The rescue inhaler must remain available at all times for acute symptoms; controllers do not relieve acute bronchospasm.'}
 ]
},

/* ------------------------------------------------------------------ */
{
 id:'CASE-POSTOP',
 title:'Postoperative complication after hip arthroplasty',
 scenario:'A 68-year-old client is on the surgical unit on postoperative day 2 following an elective right total hip arthroplasty. The client has a history of obesity and takes no anticoagulant at home.',
 record:[
  {tab:'Nurses\' Notes',text:'0730. Client reports right calf discomfort that started overnight and describes it as an ache that worsens when standing. Refused physical therapy yesterday afternoon because of pain. Sequential compression device found unplugged on the right leg. Right calf appears larger than the left; skin is warm to touch.'},
  {tab:'Vital Signs',rows:[['Temperature','37.8 C'],['Heart rate','98/min'],['Respiratory rate','20/min'],['Blood pressure','132/78 mm Hg'],['Oxygen saturation','95% on room air'],['Pain','5 of 10 right calf, 3 of 10 surgical hip']]},
  {tab:'Medications',rows:[['Enoxaparin','40 mg subcutaneously daily'],['Acetaminophen','650 mg orally every 6 hours as needed'],['Oxycodone','5 mg orally every 4 hours as needed'],['Docusate','100 mg orally twice daily']]}
 ],
 items:[
  {id:'CASE-POSTOP-1',cat:'RRP',b:0.05,type:'highlight',step:'Recognize cues',
   stem:'Highlight the findings that most concern the nurse.',
   instr:'Tap each concerning finding. Tap again to remove a highlight.',
   segments:['Right calf is larger than the left and warm to touch.',
             'Client reports right calf ache that worsens with standing.',
             'Sequential compression device was found unplugged.',
             'Client refused physical therapy yesterday.',
             'Surgical hip pain is 3 of 10.',
             'Temperature is 37.8 C.'],
   answer:[0,1,2,3],
   rationale:'Unilateral calf swelling with warmth and pain, combined with two missed prophylaxis measures — a disconnected compression device and skipped ambulation — point to deep vein thrombosis. Well-controlled surgical site pain and a low-grade temperature are common after joint arthroplasty.'},

  {id:'CASE-POSTOP-2',cat:'PHY',b:0.5,type:'cloze',step:'Analyze cues',
   stem:'Complete the sentence about the client\'s risk.',
   text:'The three elements of Virchow triad present in this client are venous stasis, endothelial injury, and hypercoagulability. Of these, the finding that most directly reflects {0} is the unplugged compression device with refused ambulation. The client is at greatest risk for {1}.',
   blanks:[
    {options:['venous stasis','endothelial injury','hypercoagulability','arterial insufficiency'],answer:0},
    {options:['pulmonary embolism','compartment syndrome','wound dehiscence','fat embolism from the femur'],answer:0}],
   rationale:'Immobility and absent mechanical prophylaxis produce venous stasis; surgery itself supplies endothelial injury and a postoperative hypercoagulable state. A clot that breaks free from the deep veins travels to the pulmonary circulation, making pulmonary embolism the most feared consequence.'},

  {id:'CASE-POSTOP-3',cat:'MOC',b:0.7,type:'mc',step:'Prioritize hypotheses',
   stem:'Which action should the nurse take first?',
   options:['Vigorously massage the calf to relieve the ache',
            'Notify the practitioner of the findings and keep the client on bed rest pending evaluation',
            'Apply a heating pad and reassess in 2 hours',
            'Have the client ambulate to see whether the pain improves'],
   answer:1,
   rationale:'When deep vein thrombosis is suspected, the leg is not massaged and ambulation is deferred until the diagnosis is established, because either can dislodge a clot. The nurse notifies the practitioner promptly so imaging and anticoagulation can be arranged.'},

  {id:'CASE-POSTOP-4',cat:'RRP',b:1.0,type:'sata',step:'Generate solutions',
   stem:'Which interventions should the nurse anticipate? Select all that apply.',
   options:['Duplex ultrasonography of the right lower extremity',
            'Therapeutic anticoagulation if the diagnosis is confirmed',
            'Reconnecting and verifying function of the sequential compression device on the unaffected leg',
            'Elevating the affected extremity',
            'Applying a tight elastic wrap from the ankle to the thigh',
            'Assessing for chest pain, dyspnea, and hypoxemia at least every 4 hours'],
   answer:[0,1,2,3,5],
   rationale:'Duplex ultrasonography confirms the diagnosis, anticoagulation prevents clot extension and embolization, mechanical prophylaxis continues on the unaffected leg, elevation reduces swelling, and frequent respiratory assessment screens for embolism. A tight wrap applied over a suspected clot can impair circulation and is not standard care.'},

  {id:'CASE-POSTOP-5',cat:'PHA',b:1.4,type:'ordered',step:'Take action',
   scenario:'Two hours later the client suddenly reports sharp chest pain and shortness of breath. Oxygen saturation drops to 86% and the heart rate rises to 128/min.',
   stem:'Place the nurse\'s actions in the order they should be performed.',
   options:['Apply high-flow oxygen and raise the head of the bed',
            'Activate the rapid response team',
            'Obtain vital signs and attach continuous pulse oximetry and cardiac monitoring',
            'Establish or verify intravenous access',
            'Prepare the client for computed tomography pulmonary angiography'],
   rationale:'Oxygenation is addressed first because hypoxemia is the immediate threat. Help is summoned next, then continuous monitoring establishes the trend, intravenous access is secured for medications and contrast, and diagnostic imaging follows once the client is stabilized and accompanied.'},

  {id:'CASE-POSTOP-6',cat:'RRP',b:1.2,type:'matrix',step:'Evaluate outcomes',
   scenario:'The client is diagnosed with a pulmonary embolism and started on a heparin infusion. The nurse reassesses 8 hours later.',
   record:[{tab:'Reassessment',rows:[['Oxygen saturation','94% on 2 L/min nasal cannula'],['Respiratory rate','20/min'],['Heart rate','92/min'],['Chest pain','1 of 10'],['aPTT','72 seconds (therapeutic range 60 to 80)'],['Gums','Small amount of bleeding when brushing teeth'],['Hemoglobin','11.8 g/dL, down from 12.2 g/dL']]}],
   stem:'Indicate whether each finding shows an expected therapeutic response or requires follow-up.',
   rowHeader:'Finding',
   rows:['Oxygen saturation 94% on 2 L/min','aPTT of 72 seconds','Chest pain reduced to 1 of 10','Minor gum bleeding when brushing','Hemoglobin 11.8 g/dL, down from 12.2 g/dL'],
   cols:['Expected therapeutic response','Requires follow-up'],
   answer:[0,0,0,1,1],
   rationale:'Improved oxygenation, a therapeutic aPTT, and reduced chest pain all show effective treatment. Any new bleeding on anticoagulation is monitored and reported, and a falling hemoglobin, even a small drop, must be trended and reported because it may signal occult bleeding.'}
 ]
},

/* ------------------------------------------------------------------ */
{
 id:'CASE-WITHDRAWAL',
 title:'Alcohol withdrawal with suicide risk',
 scenario:'A 46-year-old client is admitted to a medical unit after a fall at home. The client reports drinking approximately one liter of vodka daily for the past 4 years, with the last drink about 30 hours ago. The client recently lost their job and separated from their partner.',
 record:[
  {tab:'Nurses\' Notes',text:'0800. Client is tremulous with visible hand tremor. Diaphoretic. States "the walls look like they are moving." Startles easily. Reports nausea and no appetite. When asked about mood, states "there is not much point to any of this anymore." Denies a specific plan but states there is a firearm at home.'},
  {tab:'Vital Signs',rows:[['Temperature','37.9 C'],['Heart rate','118/min'],['Respiratory rate','22/min'],['Blood pressure','168/98 mm Hg'],['Oxygen saturation','97% on room air']]},
  {tab:'Laboratory Results',rows:[['Magnesium','1.3 mg/dL'],['Potassium','3.2 mEq/L'],['Blood alcohol','Negative'],['Aspartate aminotransferase','96 units/L'],['Platelets','118,000/mm3'],['Thiamine','Not yet resulted']]}
 ],
 items:[
  {id:'CASE-WITHDRAWAL-1',cat:'PSI',b:0.15,type:'sata',step:'Recognize cues',
   stem:'Which findings indicate that the client is in alcohol withdrawal? Select all that apply.',
   options:['Hand tremor and diaphoresis','Heart rate 118/min and blood pressure 168/98 mm Hg','Perceptual disturbance described as the walls moving','Negative blood alcohol level 30 hours after the last drink','Oxygen saturation 97% on room air','Easy startling and nausea'],
   answer:[0,1,2,5],
   rationale:'Autonomic hyperactivity with tremor, diaphoresis, tachycardia, and hypertension, along with perceptual disturbance, hyperarousal, and gastrointestinal upset, are hallmark withdrawal findings peaking at 24 to 72 hours. The negative alcohol level confirms abstinence but is not itself a withdrawal symptom, and normal oxygenation is reassuring.'},

  {id:'CASE-WITHDRAWAL-2',cat:'PSI',b:0.6,type:'matrix',step:'Analyze cues',
   stem:'Indicate whether each finding relates primarily to the client\'s physiological withdrawal risk or to the client\'s psychosocial safety risk.',
   rowHeader:'Finding',
   rows:['Blood pressure 168/98 mm Hg with tremor',
         '"There is not much point to any of this anymore"',
         'Access to a firearm at home',
         'Magnesium 1.3 mg/dL and potassium 3.2 mEq/L',
         'Recent job loss and relationship separation'],
   cols:['Physiological withdrawal risk','Psychosocial safety risk'],
   answer:[0,1,1,0,1],
   rationale:'Autonomic instability and electrolyte depletion drive the risk of withdrawal seizures and delirium tremens. Hopeless statements, access to lethal means, and recent major losses are established suicide risk factors. Both risk streams must be addressed at the same time.'},

  {id:'CASE-WITHDRAWAL-3',cat:'MOC',b:0.95,type:'mc',step:'Prioritize hypotheses',
   stem:'Which client problem should the nurse address first?',
   options:['Risk for injury from withdrawal seizure and autonomic instability',
            'Ineffective coping related to recent losses',
            'Imbalanced nutrition related to poor appetite',
            'Disturbed sleep pattern'],
   answer:0,
   rationale:'Physiological risk takes precedence: untreated severe withdrawal can progress to seizures and delirium tremens, which carry significant mortality. Suicide risk is addressed concurrently through observation and means restriction, while coping, nutrition, and sleep are managed once the client is physiologically stable.'},

  {id:'CASE-WITHDRAWAL-4',cat:'PHA',b:1.15,type:'sata',step:'Generate solutions',
   stem:'Which interventions should the nurse anticipate? Select all that apply.',
   options:['Administer a benzodiazepine using a symptom-triggered withdrawal assessment scale',
            'Administer thiamine before any glucose-containing solution',
            'Replace magnesium and potassium as prescribed',
            'Institute seizure precautions and frequent monitoring',
            'Implement suicide precautions with the level of observation ordered and remove hazardous items',
            'Restrict all visitors to reduce stimulation'],
   answer:[0,1,2,3,4],
   rationale:'Symptom-triggered benzodiazepine dosing is the standard of care for withdrawal. Thiamine precedes glucose because a glucose load in a thiamine-deficient client can precipitate Wernicke encephalopathy. Electrolyte repletion reduces seizure and dysrhythmia risk, and seizure and suicide precautions address both risk streams. Blanket visitor restriction removes support without a safety rationale.'},

  {id:'CASE-WITHDRAWAL-5',cat:'PSI',b:1.35,type:'mc',step:'Take action',
   scenario:'The client says, "I do not want my family to know how bad this got. Promise you will not tell anyone what I said about not wanting to go on."',
   stem:'What is the nurse\'s best response?',
   options:['"I promise I will keep that between us."',
            '"I care about your safety, so I cannot keep that private. I have to share it with the team so we can keep you safe, and I will tell you what I share."',
            '"You should not have told me that if you did not want it shared."',
            '"I will tell only the practitioner and no one else will know."'],
   answer:1,
   rationale:'Confidentiality has a clear limit when a client\'s safety is at risk. The nurse states the limit honestly, explains the reason, and preserves trust by telling the client what will be shared. Promising secrecy is a promise the nurse cannot ethically or legally keep.'},

  {id:'CASE-WITHDRAWAL-6',cat:'PSI',b:1.05,type:'cloze',step:'Evaluate outcomes',
   scenario:'On hospital day 3, the client\'s heart rate is 84/min, blood pressure is 128/76 mm Hg, tremor has resolved, and no perceptual disturbances are reported. The client has met with social work, agreed to a safety plan including removal of the firearm by a family member, and asks about outpatient treatment options.',
   stem:'Complete the evaluation statement.',
   text:'The client\'s withdrawal management has been {0}. The client\'s agreement to remove the firearm and interest in treatment indicate {1}.',
   blanks:[
    {options:['effective, with resolution of autonomic hyperactivity','ineffective, requiring higher benzodiazepine doses','unchanged from admission','complicated by delirium tremens'],answer:0},
    {options:['reduced access to lethal means and increased engagement in care','that suicide precautions are no longer necessary','that no follow-up is required','that the client has fully recovered from alcohol use disorder'],answer:0}],
   rationale:'Normalized vital signs with resolution of tremor and perceptual disturbance show that withdrawal has been managed effectively. Means restriction and treatment engagement meaningfully reduce risk, but they do not end the need for ongoing assessment, follow-up, and continued support; recovery from alcohol use disorder is a long-term process.'}
 ]
}

];
