import { Language } from './translations.js';

/**
 * Curated UI Chrome Translation Dictionary (EN -> Gujarati & Hindi).
 * Translates ONLY known dashboard headings, KPI card titles, nav/sub-tab labels,
 * table headers, form labels, buttons, and status badges.
 *
 * NEVER translates user-submitted descriptions, names, addresses, or free-form text.
 */
const UI_PHRASES: Record<string, { gu: string; hi: string }> = {
  // === BRAND & PORTALS ===
  'Swachh Setu': { gu: 'સ્વચ્છ સેતુ', hi: 'स्वच्छ सेतु' },
  'Navsari Municipal Cleanliness Portal': { gu: 'નવસારી મ્યુનિસિપલ સ્વચ્છતા પોર્ટલ', hi: 'नवसारी नगर निगम स्वच्छता पोर्टल' },
  'Navsari Municipal Corporation': { gu: 'નવસારી મહાનગરપાલિકા', hi: 'नवसारी नगर निगम' },
  'Navsari Municipal Corporation Central Portal': { gu: 'નવસારી મહાનગરપાલિકા કેન્દ્રીય પોર્ટલ', hi: 'नवसारी नगर निगम केंद्रीय पोर्टल' },
  'NMC Central Admin': { gu: 'NMC કેન્દ્રીય એડમિન', hi: 'NMC केंद्रीय एडमिन' },
  'NMC Admin': { gu: 'NMC એડમિન', hi: 'NMC एडमिन' },
  'NMC Admin Portal': { gu: 'NMC એડમિન પોર્ટલ', hi: 'NMC एडमिन पोर्टल' },
  'NMC Central Executive HQ': { gu: 'NMC કેન્દ્રીય મુખ્ય કચેરી', hi: 'NMC केंद्रीय मुख्यालय' },
  'NMC Central HQ': { gu: 'NMC કેન્દ્રીય કચેરી', hi: 'NMC केंद्रीय कार्यालय' },
  'NMC CENTRAL EXECUTIVE': { gu: 'NMC કેન્દ્રીય કારોબારી', hi: 'NMC केंद्रीय कार्यकारी' },
  '· Executive Authority': { gu: '· કારોબારી સત્તા', hi: '· कार्यकारी प्राधिकरण' },
  'Administrative Modules': { gu: 'વહીવટી મોડ્યુલો', hi: 'प्रशासनिक मॉड्यूल' },
  'NMC Field Operations': { gu: 'NMC ફિલ્ડ ઓપરેશન્સ', hi: 'NMC फील्ड संचालन' },
  'Community Portal': { gu: 'સમુદાય પોર્ટલ', hi: 'समुदाय पोर्टल' },
  'Community Head': { gu: 'સમુદાય વડા', hi: 'समुदाय प्रमुख' },
  'Ward Officer': { gu: 'વોર્ડ અધિકારી', hi: 'वार्ड अधिकारी' },
  'Sanitation Worker': { gu: 'સફાઈ કામદાર', hi: 'सफाई कर्मचारी' },

  // === SUPER ADMIN NAV & HEADINGS ===
  '1. Overview': { gu: '૧. સારાંશ (Overview)', hi: '1. अवलोकन (Overview)' },
  '2. Ward Management': { gu: '૨. વોર્ડ વ્યવસ્થાપન', hi: '2. वार्ड प्रबंधन' },
  '3. Ward Officer Management': { gu: '૩. વોર્ડ અધિકારી વ્યવસ્થાપન', hi: '3. वार्ड अधिकारी प्रबंधन' },
  '4. Worker & Officer Management': { gu: '૪. કામદાર અને અધિકારી વ્યવસ્થાપન', hi: '4. कर्मचारी और अधिकारी प्रबंधन' },
  '5. Set Boundary & Geofencing': { gu: '૫. સીમા અને જીઓફેન્સિંગ', hi: '5. सीमा और जियोफेंसिंग' },
  '6. Manage Categories & SLA': { gu: '૬. શ્રેણીઓ અને SLA વ્યવસ્થાપન', hi: '6. श्रेणियाँ और SLA प्रबंधन' },
  'Overview': { gu: 'સારાંશ', hi: 'अवलोकन' },
  'Wards': { gu: 'વોર્ડ્સ', hi: 'वार्ड्स' },
  'Officers': { gu: 'અધિકારીઓ', hi: 'अधिकारी' },
  'Bounds': { gu: 'સીમાઓ', hi: 'सीमाएँ' },
  'More': { gu: 'વધુ', hi: 'अधिक' },
  'City Administration & Governance': { gu: 'શહેર વહીવટ અને શાસન', hi: 'शहर प्रशासन एवं शासन' },
  'City Administration & Governance Overview': { gu: 'શહેર વહીવટ અને શાસન સારાંશ', hi: 'शहर प्रशासन एवं शासन अवलोकन' },
  'Refresh': { gu: 'રિફ્રેશ', hi: 'रिफ्रेश' },
  'Refresh Data': { gu: 'ડેટા રિફ્રેશ કરો', hi: 'डेटा रिफ्रेश करें' },
  'Set Geofence': { gu: 'જીઓફેન્સ સેટ કરો', hi: 'जियोफेंस सेट करें' },
  'Manage Officers': { gu: 'અધિકારીઓ મેનેજ કરો', hi: 'अधिकारी प्रबंधित करें' },
  'Total Wards': { gu: 'કુલ વોર્ડ', hi: 'कुल वार्ड' },
  'All 13 Municipal Wards Active': { gu: 'તમામ ૧૩ મ્યુનિસિપલ વોર્ડ સક્રિય', hi: 'सभी 13 नगर वार्ड सक्रिय' },
  'Ward Officers': { gu: 'વોર્ડ અધિકારીઓ', hi: 'वार्ड अधिकारी' },
  'Allocated across 13 wards': { gu: '૧૩ વોર્ડમાં ફાળવેલ', hi: '13 वार्डों में आवंटित' },
  'Field Workers': { gu: 'ફિલ્ડ કામદારો', hi: 'फील्ड कर्मचारी' },
  'Sanitation & Cleaning Crew': { gu: 'સફાઈ અને સ્વચ્છતા ટીમ', hi: 'सफाई एवं स्वच्छता दल' },
  'Complaints Total': { gu: 'કુલ ફરિયાદો', hi: 'कुल शिकायतें' },
  'City Cleanliness Index': { gu: 'શહેર સ્વચ્છતા સૂચકાંક', hi: 'शहर स्वच्छता सूचकांक' },
  'Weighted average score across all 13 NMC Wards': { gu: 'તમામ ૧૩ NMC વોર્ડનો સરેરાશ સ્કોર', hi: 'सभी 13 NMC वार्डों का औसत स्कोर' },
  'Grade A+': { gu: 'ગ્રેડ A+', hi: 'ग्रेड A+' },
  'SLA Compliance Rate': { gu: 'SLA પાલન દર', hi: 'SLA अनुपालन दर' },
  'Complaints approved & resolved within target deadlines': { gu: 'નિયત સમયમર્યાદામાં મંજૂર અને ઉકેલાયેલ ફરિયાદો', hi: 'निर्धारित समय सीमा में स्वीकृत व निस्तारित शिकायतें' },
  'Target: 90%': { gu: 'લક્ષ્ય: 90%', hi: 'लक्ष्य: 90%' },
  'Zero SLA violations': { gu: 'શૂન્ય SLA ઉલ્લંઘન', hi: 'शून्य SLA उल्लंघन' },
  'Complaint Categories & SLAs': { gu: 'ફરિયાદ શ્રેણીઓ અને SLA', hi: 'शिकायत श्रेणियाँ और SLA' },
  'Complaint Categories & Defined SLAs': { gu: 'ફરિયાદ શ્રેણીઓ અને નિર્ધારિત SLA', hi: 'शिकायत श्रेणियाँ और निर्धारित SLA' },
  'Manage All': { gu: 'બધું મેનેજ કરો', hi: 'सभी प्रबंधित करें' },
  'Manage All Categories': { gu: 'તમામ શ્રેણીઓ મેનેજ કરો', hi: 'सभी श्रेणियाँ प्रबंधित करें' },
  'Ward Directory & Inspection': { gu: 'વોર્ડ ડિરેક્ટરી અને નિરીક્ષણ', hi: 'वार्ड निर्देशिका और निरीक्षण' },
  'Geofence & Boundary Controls': { gu: 'જીઓફેન્સ અને સીમા નિયંત્રણ', hi: 'जियोफेंस और सीमा नियंत्रण' },
  'Staff & Personnel Registration': { gu: 'સ્ટાફ અને કર્મચારી નોંધણી', hi: 'स्टाफ और कर्मचारी पंजीकरण' },
  'MUNICIPAL WARDS DIRECTORY': { gu: 'મ્યુનિસિપલ વોર્ડ ડિરેક્ટરી', hi: 'नगर वार्ड निर्देशिका' },
  '13 Divisions': { gu: '૧૩ વિભાગો', hi: '13 प्रभाग' },
  'Navsari Ward Management': { gu: 'નવસારી વોર્ડ વ્યવસ્થાપન', hi: 'नवसारी वार्ड प्रबंधन' },
  'Ward #': { gu: 'વોર્ડ #', hi: 'वार्ड #' },
  'Ward Name & Area': { gu: 'વોર્ડનું નામ અને વિસ્તાર', hi: 'वार्ड का नाम और क्षेत्र' },
  'Administrative Office': { gu: 'વહીવટી કચેરી', hi: 'प्रशासनिक कार्यालय' },
  'Active Complaints': { gu: 'સક્રિય ફરિયાદો', hi: 'सक्रिय शिकायतें' },
  'Workers': { gu: 'કામદારો', hi: 'कर्मचारी' },
  'Cleanliness Score': { gu: 'સ્વચ્છતા સ્કોર', hi: 'स्वच्छता स्कोर' },
  'Actions': { gu: 'ક્રિયાઓ', hi: 'कार्यवाही' },
  'Details': { gu: 'વિગતો', hi: 'विवरण' },
  'Boundary': { gu: 'સીમા', hi: 'सीमा' },
  'OFFICER DIRECTORY & MULTI-WARD ALLOCATION': { gu: 'અધિકારી ડિરેક્ટરી અને વોર્ડ ફાળવણી', hi: 'अधिकारी निर्देशिका और वार्ड आवंटन' },
  'Ward Officer Management': { gu: 'વોર્ડ અધિકારી વ્યવસ્થાપન', hi: 'वार्ड अधिकारी प्रबंधन' },
  'Add Officer': { gu: 'અધિકારી ઉમેરો', hi: 'अधिकारी जोड़ें' },
  'Officer Name': { gu: 'અધિકારીનું નામ', hi: 'अधिकारी का नाम' },
  'Contact Phone': { gu: 'સંપર્ક ફોન', hi: 'संपर्क फ़ोन' },
  'Email': { gu: 'ઇમેઇલ', hi: 'ईमेल' },
  'Assigned Wards': { gu: 'ફાળવેલ વોર્ડ', hi: 'आवंटित वार्ड' },
  'SLA Status': { gu: 'SLA સ્થિતિ', hi: 'SLA स्थिति' },
  'Status': { gu: 'સ્થિતિ', hi: 'स्थिति' },
  'Compliant': { gu: 'અનુપાલન', hi: 'अनुपालित' },
  'Active': { gu: 'સક્રિય', hi: 'सक्रिय' },
  'Inactive': { gu: 'નિષ્ક્રિય', hi: 'निष्क्रिय' },
  'Update / Allocate': { gu: 'અપડેટ / ફાળવો', hi: 'अपडेट / आवंटित करें' },
  'Full Access': { gu: 'સંપૂર્ણ ઍક્સેસ', hi: 'पूर्ण पहुँच' },
  'Full Access (All 12 Tabs)': { gu: 'સંપૂર્ણ ઍક્સેસ (તમામ ૧૨ ટેબ્સ)', hi: 'पूर्ण पहुँच (सभी 12 टैब)' },
  'Give Full Access': { gu: 'સંપૂર્ણ ઍક્સેસ આપો', hi: 'पूर्ण पहुँच दें' },
  'NMC WORKFORCE REGISTRATION & AUTH': { gu: 'NMC કર્મચારી નોંધણી અને ઓથેન્ટિકેશન', hi: 'NMC कार्यबल पंजीकरण एवं प्रमाणीकरण' },
  'Municipal Worker & Officer Management': { gu: 'મ્યુનિસિપલ કામદાર અને અધિકારી વ્યવસ્થાપન', hi: 'नगर कर्मचारी एवं अधिकारी प्रबंधन' },
  'Add Worker': { gu: 'કામદાર ઉમેરો', hi: 'कर्मचारी जोड़ें' },
  'Worker Code': { gu: 'કામદાર કોડ', hi: 'कर्मचारी कोड' },
  'Full Name': { gu: 'પૂરું નામ', hi: 'पूरा नाम' },
  'Designation': { gu: 'હોદ્દો', hi: 'पदनाम' },
  'Contact Phone (Login)': { gu: 'સંપર્ક ફોન (લોગિન)', hi: 'संपर्क फ़ोन (लॉगिन)' },
  'Assigned Ward': { gu: 'ફાળવેલ વોર્ડ', hi: 'आवंटित वार्ड' },
  'Language': { gu: 'ભાષા', hi: 'भाषा' },
  'Official Email': { gu: 'સત્તાવાર ઇમેઇલ', hi: 'आधिकारिक ईमेल' },
  'GRIEVANCE CLASSIFICATION & SLA ENFORCEMENT': { gu: 'ફરિયાદ વર્ગીકરણ અને SLA અમલીકરણ', hi: 'शिकायत वर्गीकरण एवं SLA प्रवर्तन' },
  'Manage Complaint Categories & SLA Deadlines': { gu: 'ફરિયાદ શ્રેણીઓ અને SLA સમયમર્યાદા', hi: 'शिकायत श्रेणियाँ और SLA समय सीमा' },
  'Add Category': { gu: 'શ્રેણી ઉમેરો', hi: 'श्रेणी जोड़ें' },
  'Icon & Category': { gu: 'આઇકન અને શ્રેણી', hi: 'आइकन और श्रेणी' },
  'Gujarati / Regional': { gu: 'ગુજરાતી / પ્રાદેશિક', hi: 'गुजराती / क्षेत्रीय' },
  'Description': { gu: 'વર્ણન', hi: 'विवरण' },
  'Max Approval (SLA)': { gu: 'મહત્તમ મંજૂરી (SLA)', hi: 'अधिकतम स्वीकृति (SLA)' },
  'Max Resolution (SLA)': { gu: 'મહત્તમ ઉકેલ (SLA)', hi: 'अधिकतम निस्तारण (SLA)' },
  'Active Issues': { gu: 'સક્રિય સમસ્યાઓ', hi: 'सक्रिय समस्याएँ' },
  'City & Ward Boundary Geofencing': { gu: 'શહેર અને વોર્ડ સીમા જીઓફેન્સિંગ', hi: 'शहर एवं वार्ड सीमा जियोफेंसिंग' },
  'Navsari City Boundary': { gu: 'નવસારી શહેર સીમા', hi: 'नवसारी शहर सीमा' },
  'City Boundary': { gu: 'શહેર સીમા', hi: 'शहर सीमा' },
  'Ward Area Boundaries': { gu: 'વોર્ડ વિસ્તાર સીમાઓ', hi: 'वार्ड क्षेत्र सीमाएँ' },
  'Ward Bounds': { gu: 'વોર્ડ સીમા', hi: 'वार्ड सीमाएँ' },
  'Navsari Geofence Controls': { gu: 'નવસારી જીઓફેન્સ નિયંત્રણો', hi: 'नवसारी जियोफेंस नियंत्रण' },
  'Ward Zone Controls': { gu: 'વોર્ડ ઝોન નિયંત્રણો', hi: 'वार्ड ज़ोन नियंत्रण' },
  'Select Ward (1 to 13)': { gu: 'વોર્ડ પસંદ કરો (૧ થી ૧૩)', hi: 'वार्ड चुनें (1 से 13)' },
  'Geofencing Rules': { gu: 'જીઓફેન્સિંગ નિયમો', hi: 'जियोफेंसिंग नियम' },
  'Drawing Actions': { gu: 'ડ્રોઇંગ ક્રિયાઓ', hi: 'ड्रॉइंग क्रियाएँ' },
  'Redraw Perimeter (Click Map)': { gu: 'સીમા ફરી દોરો (નકશા પર ક્લિક કરો)', hi: 'सीमा पुनः बनाएँ (मैप पर क्लिक करें)' },
  'Previous Set Boundaries': { gu: 'અગાઉ સેટ કરેલી સીમાઓ', hi: 'पूर्व निर्धारित सीमाएँ' },
  'Refresh History': { gu: 'ઇતિહાસ રિફ્રેશ કરો', hi: 'इतिहास रिफ्रेश करें' },
  'Boundary Target': { gu: 'સીમા લક્ષ્ય', hi: 'सीमा लक्ष्य' },
  'Location / Highlighted Areas': { gu: 'સ્થળ / મુખ્ય વિસ્તારો', hi: 'स्थान / प्रमुख क्षेत्र' },
  'Center Lat / Lng': { gu: 'કેન્દ્ર અક્ષાંશ / રેખાંશ', hi: 'केंद्र अक्षांश / देशांतर' },
  'Saved At': { gu: 'સાચવેલ સમય', hi: 'सहेजा गया समय' },
  'Preview': { gu: 'પૂર્વાવલોકન', hi: 'पूर्वावलोकन' },
  'Preview Map': { gu: 'નકશો જુઓ', hi: 'मैप देखें' },
  'Action': { gu: 'ક્રિયા', hi: 'कार्यवाही' },
  'Current Active': { gu: 'હાલમાં સક્રિય', hi: 'वर्तमान सक्रिय' },
  'Set This Location': { gu: 'આ સ્થાન સેટ કરો', hi: 'यह स्थान सेट करें' },
  'Set Location': { gu: 'સ્થાન સેટ કરો', hi: 'स्थान सेट करें' },

  // === WARD OFFICER DASHBOARD & INSPECT VIEW ===
  'Complaint Catalogue': { gu: 'ફરિયાદ કેટલોગ', hi: 'शिकायत सूची' },
  'Resolved Complaints': { gu: 'ઉકેલાયેલ ફરિયાદો', hi: 'निस्तारित शिकायतें' },
  'Complaint ID & Category': { gu: 'ફરિયાદ ID અને શ્રેણી', hi: 'शिकायत ID और श्रेणी' },
  'Location / Landmark': { gu: 'સ્થળ / લેન્ડમાર્ક', hi: 'स्थान / लैंडमार्क' },
  'Priority & SLA': { gu: 'પ્રાથમિકતા અને SLA', hi: 'प्राथमिकता और SLA' },
  'Assigned Unit & Leader': { gu: 'ફાળવેલ ટીમ અને લીડર', hi: 'आवंटित टीम और लीडर' },
  'Progress Status': { gu: 'પ્રગતિ સ્થિતિ', hi: 'प्रगति स्थिति' },
  'View': { gu: 'જુઓ', hi: 'देखें' },
  'Inspect': { gu: 'તપાસો', hi: 'निरीक्षण' },
  'Track': { gu: 'ટ્રેક', hi: 'ट्रैक' },
  'Reopen': { gu: 'ફરી ખોલો', hi: 'पुनः खोलें' },
  'Delete': { gu: 'કાઢી નાખો', hi: 'हटाएँ' },
  'Edit': { gu: 'ફેરફાર', hi: 'संपादित करें' },
  'Reset Filters': { gu: 'ફિલ્ટર રીસેટ કરો', hi: 'फ़िल्टर रीसेट करें' },
  'Back to Catalogue': { gu: 'કેટલોગ પર પાછા જાઓ', hi: 'सूची पर वापस जाएँ' },
  'Back': { gu: 'પાછા', hi: 'वापस' },
  'Verify & Complete': { gu: 'ચકાસો અને પૂર્ણ કરો', hi: 'सत्यापित एवं पूर्ण करें' },
  'Verify & Mark Complete': { gu: 'ચકાસો અને પૂર્ણ તરીકે ચિહ્નિત કરો', hi: 'सत्यापित कर पूर्ण चिह्नित करें' },
  'Verified': { gu: 'ચકાસાયેલ', hi: 'सत्यापित' },
  'Publish Post': { gu: 'પોસ્ટ પ્રકાશિત કરો', hi: 'पोस्ट प्रकाशित करें' },
  'Posted ✓': { gu: 'પોસ્ટ થઈ ગયું ✓', hi: 'पोस्ट किया गया ✓' },
  '1. Info': { gu: '૧. માહિતી', hi: '1. जानकारी' },
  '2. Team': { gu: '૨. ટીમ', hi: '2. टीम' },
  '3. Attendance': { gu: '૩. હાજરી', hi: '3. उपस्थिति' },
  '4. Evidence': { gu: '૪. પુરાવા', hi: '4. साक्ष्य' },
  '5. History': { gu: '૫. ઇતિહાસ', hi: '5. इतिहास' },
  '1. Complaint Info': { gu: '૧. ફરિયાદ માહિતી', hi: '1. शिकायत जानकारी' },
  '2. Assigned Team': { gu: '૨. ફાળવેલ ટીમ', hi: '2. आवंटित टीम' },
  '4. Leader Evidence': { gu: '૪. લીડર પુરાવા', hi: '4. लीडर साक्ष्य' },
  '5. Evidence History': { gu: '૫. પુરાવા ઇતિહાસ', hi: '5. साक्ष्य इतिहास' },
  'Citizen Original Report': { gu: 'નાગરિકની મૂળ ફરિયાદ', hi: 'नागरिक की मूल रिपोर्ट' },
  'Citizen Photo Evidence': { gu: 'નાગરિક ફોટો પુરાવો', hi: 'नागरिक फोटो साक्ष्य' },
  'Category': { gu: 'શ્રેણી', hi: 'श्रेणी' },
  'Citizen Description': { gu: 'નાગરિકનું વર્ણન', hi: 'नागरिक का विवरण' },
  'Reported By': { gu: 'ફરિયાદી', hi: 'रिपोर्टकर्ता' },
  'Anonymous Citizen': { gu: 'અનામી નાગરિક', hi: 'अनाम नागरिक' },
  'Geographical Location & Geofence': { gu: 'ભૌગોલિક સ્થાન અને જીઓફેન્સ', hi: 'भौगोलिक स्थान और जियोफेंस' },
  'Day-to-Day Geofenced Attendance Records': { gu: 'દૈનિક જીઓફેન્સ્ડ હાજરી રેકોર્ડ્સ', hi: 'दैनिक जियोफेंस्ड उपस्थिति रिकॉर्ड' },
  '100m Geofence Active': { gu: '૧૦૦ મીટર જીઓફેન્સ સક્રિય', hi: '100 मी जियोफेंस सक्रिय' },
  'Squad Member': { gu: 'ટીમ સભ્ય', hi: 'दल सदस्य' },
  'Role': { gu: 'ભૂમિકા', hi: 'भूमिका' },
  'Check-in Time': { gu: 'ચેક-ઇન સમય', hi: 'चेक-इन समय' },
  'GPS Distance to Site': { gu: 'સ્થળથી GPS અંતર', hi: 'स्थल से GPS दूरी' },
  'Verification Status': { gu: 'ચકાસણી સ્થિતિ', hi: 'सत्यापन स्थिति' },
  'Team Leader': { gu: 'ટીમ લીડર', hi: 'टीम लीडर' },
  'Team Leader Evidence Dossier': { gu: 'ટીમ લીડર પુરાવા ડોઝિયર', hi: 'टीम लीडर साक्ष्य विवरण' },
  'Before Cleanup Stage': { gu: 'સફાઈ પહેલાંની સ્થિતિ', hi: 'सफाई से पहले का चरण' },
  'After Cleanup Stage (Completion Proof)': { gu: 'સફાઈ પછીની સ્થિતિ (પૂર્ણતા પુરાવો)', hi: 'सफाई के बाद का चरण (पूर्णता प्रमाण)' },
  'Litter Clearance Index': { gu: 'કચરો સાફ સૂચકાંક', hi: 'कचरा सफाई सूचकांक' },
  'Geofence GPS Match': { gu: 'જીઓફેન્સ GPS મેચ', hi: 'जियोफेंस GPS मिलान' },
  'Ground Context Match': { gu: 'સ્થળ સુસંગતતા', hi: 'स्थल संदर्भ मिलान' },
  'Digital Tampering Check': { gu: 'ડિજિટલ છેડછાડ તપાસ', hi: 'डिजिटल छेड़छाड़ जाँच' },
  'Day-to-Day Complete Action & Evidence History': { gu: 'દૈનિક સંપૂર્ણ કાર્ય અને પુરાવા ઇતિહાસ', hi: 'दैनिक पूर्ण कार्य एवं साक्ष्य इतिहास' },
  'Refresh Evidence': { gu: 'પુરાવા રિફ્રેશ કરો', hi: 'साक्ष्य रिफ्रेश करें' },
  'Approval Management': { gu: 'મંજૂરી વ્યવસ્થાપન', hi: 'स्वीकृति प्रबंधन' },
  'Community Register Approval': { gu: 'સમુદાય નોંધણી મંજૂરી', hi: 'समुदाय पंजीकरण स्वीकृति' },
  'Cleanliness Drive Approval': { gu: 'સ્વચ્છતા અભિયાન મંજૂરી', hi: 'स्वच्छता अभियान स्वीकृति' },
  'Pending Verification': { gu: 'ચકાસણી બાકી', hi: 'सत्यापन लंबित' },
  'Contact Info': { gu: 'સંપર્ક માહિતી', hi: 'संपर्क जानकारी' },
  'Location & Ward': { gu: 'સ્થાન અને વોર્ડ', hi: 'स्थान और वार्ड' },
  'Verification Certificate / Proof': { gu: 'ચકાસણી પ્રમાણપત્ર / પુરાવો', hi: 'सत्यापन प्रमाणपत्र / प्रमाण' },
  'Approve': { gu: 'મંજૂર કરો', hi: 'स्वीकृत करें' },
  'Reject': { gu: 'નકારો', hi: 'अस्वीकार करें' },
  'Organization Drives': { gu: 'સંસ્થા અભિયાનો', hi: 'संगठन अभियान' },
  'Add Community': { gu: 'સમુદાય ઉમેરો', hi: 'समुदाय जोड़ें' },
  'Organization': { gu: 'સંસ્થા', hi: 'संगठन' },
  'Contact': { gu: 'સંપર્ક', hi: 'संपर्क' },
  'Ward / Area': { gu: 'વોર્ડ / વિસ્તાર', hi: 'वार्ड / क्षेत्र' },
  'Document': { gu: 'દસ્તાવેજ', hi: 'दस्तावेज़' },
  '1. Details & Attendance': { gu: '૧. વિગતો અને હાજરી', hi: '1. विवरण और उपस्थिति' },
  'Citizen Volunteer': { gu: 'નાગરિક સ્વયંસેવક', hi: 'नागरिक स्वयंसेवक' },
  'Registration Status': { gu: 'નોંધણી સ્થિતિ', hi: 'पंजीकरण स्थिति' },
  'Attendance': { gu: 'હાજરી', hi: 'उपस्थिति' },
  'Mark Attendance': { gu: 'હાજરી નોંધો', hi: 'उपस्थिति दर्ज करें' },
  'Present': { gu: 'હાજર', hi: 'उपस्थित' },
  'Absent': { gu: 'ગેરહાજર', hi: 'अनुपस्थित' },
  'Unmarked': { gu: 'અચિહ્નિત', hi: 'अचिह्नित' },
  'Certificate Code': { gu: 'પ્રમાણપત્ર કોડ', hi: 'प्रमाणपत्र कोड' },
  'Recipient Name': { gu: 'પ્રાપ્તકર્તાનું નામ', hi: 'प्राप्तकर्ता का नाम' },
  'Issued Date': { gu: 'જારી તારીખ', hi: 'जारी तिथि' },
  'View Certificate': { gu: 'પ્રમાણપત્ર જુઓ', hi: 'प्रमाणपत्र देखें' },
  'Worker Personnel': { gu: 'કામદાર કર્મચારી', hi: 'कर्मचारी विवरण' },
  'Certified Skills': { gu: 'પ્રમાણિત કુશળતા', hi: 'प्रमाणित कौशल' },
  'Availability': { gu: 'ઉપલબ્ધતા', hi: 'उपलब्धता' },
  "Today's Deployment": { gu: 'આજની ફરજ', hi: 'आज की तैनाती' },
  'Team Unit Name': { gu: 'ટીમ યુનિટનું નામ', hi: 'टीम इकाई का नाम' },
  'Specialization & Workload': { gu: 'વિશેષતા અને કાર્યભાર', hi: 'विशेषज्ञता और कार्यभार' },
  'Temporary Team Leader': { gu: 'અસ્થાયી ટીમ લીડર', hi: 'अस्थायी टीम लीडर' },
  'Assigned Members': { gu: 'ફાળવેલ સભ્યો', hi: 'आवंटित सदस्य' },
  'Operational Status': { gu: 'કાર્યકારી સ્થિતિ', hi: 'परिचालन स्थिति' },
  'Create New Team': { gu: 'નવી ટીમ બનાવો', hi: 'नई टीम बनाएँ' },
  'Worker Name & Code': { gu: 'કામદારનું નામ અને કોડ', hi: 'कर्मचारी नाम और कोड' },
  'Skills': { gu: 'કુશળતા', hi: 'कौशल' },
  'Phone': { gu: 'ફોન', hi: 'फ़ोन' },
  'Seasonal Risk Alerts': { gu: 'મોસમી જોખમ ચેતવણીઓ', hi: 'मौसमी जोखिम अलर्ट' },
  'Top Performers': { gu: 'શ્રેષ્ઠ પ્રદર્શનકારો', hi: 'शीर्ष प्रदर्शनकर्ता' },
  'Category Turnaround Breakdown': { gu: 'શ્રેણી મુજબ નિરાકરણ વિશ્લેષણ', hi: 'श्रेणीवार निस्तारण विवरण' },
  'Total Logged': { gu: 'કુલ નોંધાયેલ', hi: 'कुल दर्ज' },
  'Resolved': { gu: 'ઉકેલાયેલ', hi: 'निस्तारित' },
  'Avg Resolution': { gu: 'સરેરાશ ઉકેલ સમય', hi: 'औसत निस्तारण समय' },
  'Add Problem for Community': { gu: 'સમુદાય માટે સમસ્યા ઉમેરો', hi: 'समुदाय के लिए समस्या जोड़ें' },
  'Urgency Level': { gu: 'તાકીદનું સ્તર', hi: 'तात्कालिकता स्तर' },
  'Estimated Volunteers Needed': { gu: 'અંદાજિત જરૂરી સ્વયંસેવકો', hi: 'अनुमानित आवश्यक स्वयंसेवक' },

  // === COMMUNITY HEAD DASHBOARD ===
  'Create New Activity': { gu: 'નવું અભિયાન બનાવો', hi: 'नई गतिविधि बनाएँ' },
  'Actions Requiring Community Head Attention': { gu: 'સમુદાય વડાના ધ્યાન માટે જરૂરી કાર્યો', hi: 'समुदाय प्रमुख के ध्यान हेतु आवश्यक कार्य' },
  'Total Drives': { gu: 'કુલ અભિયાનો', hi: 'कुल अभियान' },
  'Upcoming Drives': { gu: 'આગામી અભિયાનો', hi: 'आगामी अभियान' },
  'Completed Drives': { gu: 'પૂર્ણ થયેલ અભિયાનો', hi: 'पूर्ण अभियान' },
  'Registered Volunteers': { gu: 'નોંધાયેલ સ્વયંસેવકો', hi: 'पंजीकृत स्वयंसेवक' },
  'Attendance Rate': { gu: 'હાજરી દર', hi: 'उपस्थिति दर' },
  'Organization & Leadership Certificates': { gu: 'સંસ્થા અને નેતૃત્વ પ્રમાણપત્રો', hi: 'संगठन एवं नेतृत्व प्रमाणपत्र' },
  'No Certificates Issued Yet': { gu: 'હજુ સુધી કોઈ પ્રમાણપત્ર જારી થયું નથી', hi: 'अभी तक कोई प्रमाणपत्र जारी नहीं हुआ है' },
  'View Details': { gu: 'વિગતો જુઓ', hi: 'विवरण देखें' },
  'Volunteer Name': { gu: 'સ્વયંસેવકનું નામ', hi: 'स्वयंसेवक का नाम' },
  'Registered At': { gu: 'નોંધણી સમય', hi: 'पंजीकरण समय' },
  'Ground Action': { gu: 'ફિલ્ડ ક્રિયા', hi: 'स्थल कार्यवाही' },
  'Unanswered': { gu: 'અનુત્તરિત', hi: 'अनुत्तरित' },
  'Answered': { gu: 'જવાબ આપેલ', hi: 'उत्तरित' },
  'Closed': { gu: 'બંધ', hi: 'बंद' },
  'All Inquiries': { gu: 'તમામ પ્રશ્નો', hi: 'सभी प्रश्न' },
  'Problems': { gu: 'સમસ્યાઓ', hi: 'समस्याएँ' },
  'Posts': { gu: 'પોસ્ટ્સ', hi: 'पोस्ट्स' },
  'Ward Problems for Community Action': { gu: 'સમુદાય કાર્યવાહી માટે વોર્ડ સમસ્યાઓ', hi: 'समुदाय कार्रवाई हेतु वार्ड समस्याएँ' },

  // === SANITATION WORKER DASHBOARD ===
  'Work History & Log': { gu: 'કાર્ય ઇતિહાસ અને નોંધ', hi: 'कार्य इतिहास और लॉग' },
  'No Work History Recorded Yet': { gu: 'હજુ સુધી કોઈ કાર્ય ઇતિહાસ નોંધાયેલ નથી', hi: 'अभी तक कोई कार्य इतिहास दर्ज नहीं है' },
  'Task Code & Date': { gu: 'કાર્ય કોડ અને તારીખ', hi: 'कार्य कोड और तिथि' },
  'Work Category': { gu: 'કાર્ય શ્રેણી', hi: 'कार्य श्रेणी' },
  'Location': { gu: 'સ્થાન', hi: 'स्थान' },
  'Shift Date': { gu: 'શિફ્ટ તારીખ', hi: 'शिफ्ट तिथि' },
  'Worker Attendance': { gu: 'કામદાર હાજરી', hi: 'कर्मचारी उपस्थिति' },
  'Waste Cleared': { gu: 'સાફ કરેલ કચરો', hi: 'साफ किया गया कचरा' },

  // === AUTH PAGE & CITIZEN ===
  'Citizen Login': { gu: 'નાગરિક લોગિન', hi: 'नागरिक लॉगिन' },
  'New Registration': { gu: 'નવી નોંધણી', hi: 'नया पंजीकरण' },
  'Welcome to Swachh Setu': { gu: 'સ્વચ્છ સેતુમાં આપનું સ્વાગત છે', hi: 'स्वच्छ सेतु में आपका स्वागत है' },
  'Sign in with Mobile Number, Username, or Worker Code': { gu: 'મોબાઇલ નંબર, યુઝરનેમ અથવા વર્કર કોડથી સાઇન ઇન કરો', hi: 'मोबाइल नंबर, यूज़रनेम या वर्कर कोड से साइन इन करें' },
  'Username / Mobile Number': { gu: 'યુઝરનેમ / મોબાઇલ નંબર', hi: 'यूज़रनेम / मोबाइल नंबर' },
  'Password': { gu: 'પાસવર્ડ', hi: 'पासवर्ड' },
  'Forgot Password?': { gu: 'પાસવર્ડ ભૂલી ગયા?', hi: 'पासवर्ड भूल गए?' },
  'Sign In to Dashboard': { gu: 'ડેશબોર્ડમાં સાઇન ઇન કરો', hi: 'डैशबोर्ड में साइन इन करें' },
  'Quick Access': { gu: 'ઝડપી પ્રવેશ', hi: 'त्वरित प्रवेश' },
  'Super Admin Quick Login': { gu: 'સુપર એડમિન ઝડપી લોગિન', hi: 'सुपर एडमिन त्वरित लॉगिन' },
  'Sign Up Free': { gu: 'મફત સાઇન અપ કરો', hi: 'मुफ़्त साइन अप करें' },
  'Citizen Registration': { gu: 'નાગરિક નોંધણી', hi: 'नागरिक पंजीकरण' },
  'Community Registration': { gu: 'સમુદાય નોંધણી', hi: 'समुदाय पंजीकरण' },
  'Mobile Number': { gu: 'મોબાઇલ નંબર', hi: 'मोबाइल नंबर' },
  'Verify OTP': { gu: 'OTP ચકાસો', hi: 'OTP सत्यापित करें' },
  'SMS Sent to Your Mobile': { gu: 'તમારા મોબાઇલ પર SMS મોકલાયો છે', hi: 'आपके मोबाइल पर SMS भेजा गया है' },
  'Resend OTP': { gu: 'OTP ફરી મોકલો', hi: 'OTP पुनः भेजें' },
  'Sign In': { gu: 'સાઇન ઇન', hi: 'साइन इन' },
  'Locality / Area': { gu: 'વિસ્તાર / લોકાલિટી', hi: 'क्षेत्र / इलाका' },
  'Office Address': { gu: 'ઓફિસનું સરનામું', hi: 'कार्यालय का पता' },
  'About Your Organization': { gu: 'તમારી સંસ્થા વિશે', hi: 'आपके संगठन के बारे में' },
  'Submit Community Registration for Approval': { gu: 'મંજૂરી માટે સમુદાય નોંધણી સબમિટ કરો', hi: 'स्वीकृति के लिए समुदाय पंजीकरण जमा करें' },

  // === WARD ANALYSIS (SUPER ADMIN) ===
  '2. Ward Analysis': { gu: '2. વોર્ડ વિશ્લેષણ', hi: '2. वार्ड विश्लेषण' },
  '3. Ward Management': { gu: '3. વોર્ડ મેનેજમેન્ટ', hi: '3. वार्ड प्रबंधन' },
  '4. Ward Officer Management': { gu: '4. વોર્ડ ઓફિસર મેનેજમેન્ટ', hi: '4. वार्ड अधिकारी प्रबंधन' },
  '5. Worker & Officer Management': { gu: '5. કામદાર અને ઓફિસર મેનેજમેન્ટ', hi: '5. कर्मचारी एवं अधिकारी प्रबंधन' },
  '6. Set Boundary & Geofencing': { gu: '6. સીમા અને જીઓફેન્સિંગ સેટ કરો', hi: '6. सीमा और जियोफेंसिंग सेट करें' },
  '7. Manage Categories & SLA': { gu: '7. શ્રેણીઓ અને SLA મેનેજ કરો', hi: '7. श्रेणियाँ और SLA प्रबंधित करें' },
  'Ward Analysis': { gu: 'વોર્ડ વિશ્લેષણ', hi: 'वार्ड विश्लेषण' },
  'Ward Analysis & Deep Inspection': { gu: 'વોર્ડ વિશ્લેષણ અને ઊંડાણપૂર્વક તપાસ', hi: 'वार्ड विश्लेषण एवं गहन निरीक्षण' },
  'Overview & Categories': { gu: 'ઝાંખી અને શ્રેણીઓ', hi: 'सारांश और श्रेणियाँ' },
  'Hotspots Map': { gu: 'હોટસ્પોટ્સ નકશો', hi: 'हॉटस्पॉट्स मानचित्र' },
  'AI Analytics': { gu: 'AI એનાલિટિક્સ', hi: 'AI एनालिटिक्स' },
  'Problems & Status Tracking': { gu: 'સમસ્યાઓ અને સ્થિતિ ટ્રેકિંગ', hi: 'समस्याएँ एवं स्थिति ट्रैकिंग' },
  'Workforce & Civic Ops': { gu: 'સ્ટાફ અને નાગરિક કામગીરી', hi: 'कार्यबल एवं नागरिक संचालन' },
  'Total Problems': { gu: 'કુલ સમસ્યાઓ', hi: 'कुल समस्याएँ' },
  'Active / Open': { gu: 'સક્રિય / બાકી', hi: 'सक्रिय / लंबित' },
  'Resolved Rate': { gu: 'ઉકેલ દર', hi: 'समाधान दर' },
  'SLA Compliance': { gu: 'SLA પાલન', hi: 'SLA अनुपालन' },
  'Hotspots & Crew': { gu: 'હોટસ્પોટ્સ અને ટીમ', hi: 'हॉटस्पॉट्स और दल' },
  'Live Cleanliness Score': { gu: 'લાઇવ સ્વચ્છતા સ્કોર', hi: 'लाइव स्वच्छता स्कोर' },
  'Category-Wise Problem Count & SLA Performance': { gu: 'શ્રેણી મુજબ સમસ્યાઓની ગણતરી અને SLA કામગીરી', hi: 'श्रेणीवार समस्या गणना और SLA प्रदर्शन' },
  'Status Lifecycle Distribution': { gu: 'સ્થિતિ જીવનચક્ર વિતરણ', hi: 'स्थिति जीवनचक्र वितरण' },
  '6-Month Activity Trend': { gu: '6 મહિનાની પ્રવૃત્તિ ટ્રેન્ડ', hi: '6 माह की गतिविधि रुझान' },
  'Status Tracking Audit Timeline': { gu: 'સ્થિતિ ટ્રેકિંગ ઓડિટ ટાઇમલાઇન', hi: 'स्थिति ट्रैकिंग ऑडिट टाइमलाइन' },
  'Track Status': { gu: 'સ્થિતિ ટ્રેક કરો', hi: 'स्थिति ट्रैक करें' },
  'Analyze': { gu: 'વિશ્લેષણ', hi: 'विश्लेषण' },
  'Analysis': { gu: 'વિશ્લેષણ', hi: 'विश्लेषण' },
  'Export CSV': { gu: 'CSV નિકાસ કરો', hi: 'CSV निर्यात करें' },
  'Bulk Upload Excel': { gu: 'એક્સેલ દ્વારા બલ્ક અપલોડ', hi: 'एक्सेल से बल्क अपलोड' },
  'Single Registration': { gu: 'સિંગલ નોંધણી', hi: 'एकल पंजीकरण' },
  'Bulk Upload (Excel)': { gu: 'બલ્ક અપલોડ (Excel)', hi: 'बल्क अपलोड (Excel)' },
  'Download Excel Format': { gu: 'Excel ફોર્મેટ ડાઉનલોડ કરો', hi: 'Excel प्रारूप डाउनलोड करें' },
  'Download Excel Column Format (.xlsx)': { gu: 'Excel કોલમ ફોર્મેટ ડાઉનલોડ કરો (.xlsx)', hi: 'Excel कॉलम प्रारूप डाउनलोड करें (.xlsx)' },

  // === COMMON WIDGETS & BANNERS ===
  'Enable Mobile Alerts': { gu: 'મોબાઇલ એલર્ટ્સ ચાલુ કરો', hi: 'मोबाइल अलर्ट चालू करें' },
  'Get instant push notifications like WhatsApp': { gu: 'WhatsApp જેવી ત્વરિત પુશ સૂચનાઓ મેળવો', hi: 'WhatsApp जैसी त्वरित पुश सूचनाएँ प्राप्त करें' },
  'Allow': { gu: 'મંજૂરી આપો', hi: 'अनुमति दें' },
  'Enabling...': { gu: 'ચાલુ થઈ રહ્યું છે...', hi: 'चालू हो रहा है...' },
  'Mobile Push Notifications Activated!': { gu: 'મોબાઇલ પુશ સૂચનાઓ સક્રિય થઈ ગઈ!', hi: 'मोबाइल पुश सूचनाएँ सक्रिय हो गईं!' },
  'Live Location Active': { gu: 'લાઇવ લોકેશન સક્રિય', hi: 'लाइव लोकेशन सक्रिय' },
  'GPS Monitored': { gu: 'GPS નિરીક્ષણ હેઠળ', hi: 'GPS निगरानी सक्रिय' },
  'Enable Location Services': { gu: 'લોકેશન સેવાઓ ચાલુ કરો', hi: 'लोकेशन सेवाएँ चालू करें' },
  'Remind Me Later': { gu: 'પછી યાદ કરાવો', hi: 'बाद में याद दिलाएँ' },
  'Enable & Verify Location': { gu: 'લોકેશન ચાલુ અને ચકાસો', hi: 'लोकेशन चालू और सत्यापित करें' },
  'Prev': { gu: 'પાછલું', hi: 'पिछला' },
  'Next': { gu: 'આગળ', hi: 'अगला' },
  'Cancel': { gu: 'રદ કરો', hi: 'रद्द करें' },
  'Save': { gu: 'સાચવો', hi: 'सहेजें' },
  'Close': { gu: 'બંધ કરો', hi: 'बंद करें' },
  'Dismiss': { gu: 'બંધ કરો', hi: 'हटाएँ' },
  'Submitted': { gu: 'સબમિટ થયેલ', hi: 'जमा किया गया' },
  'Under Review': { gu: 'સમીક્ષા હેઠળ', hi: 'समीक्षाधीन' },
  'Team Assigned': { gu: 'ટીમ ફાળવેલ', hi: 'टीम आवंटित' },
  'In Progress': { gu: 'પ્રગતિમાં', hi: 'प्रगति पर' },
  'Verification': { gu: 'ચકાસણી', hi: 'सत्यापन' },
  'Pending': { gu: 'બાકી', hi: 'लंबित' },
  'All': { gu: 'બધા', hi: 'सभी' },
  'Logout': { gu: 'લોગઆઉટ', hi: 'लॉगआउट' },
  'Notifications': { gu: 'સૂચનાઓ', hi: 'सूचनाएँ' }
};

// Dynamic UI chrome patterns (never matches long user descriptions)
function translateDynamicUiPattern(trimmed: string, lang: 'gu' | 'hi'): string | null {
  if (trimmed.length > 72) return null;

  // "Ward 3" / "WARD 3" / "NMC · Ward 3"
  let m = trimmed.match(/^NMC\s*·\s*Ward\s*(\d+)$/i);
  if (m) return lang === 'gu' ? `NMC · વોર્ડ ${m[1]}` : `NMC · वार्ड ${m[1]}`;

  m = trimmed.match(/^Ward\s*(\d+)$/i);
  if (m) return lang === 'gu' ? `વોર્ડ ${m[1]}` : `वार्ड ${m[1]}`;

  // "1. Active (3)", "2. History (5)", "3. Organizations (4)", "2. Evidence (2)", "3. Certificates (6)"
  m = trimmed.match(/^1\.\s*Active\s*\((\d+)\)$/i);
  if (m) return lang === 'gu' ? `૧. સક્રિય (${m[1]})` : `1. सक्रिय (${m[1]})`;

  m = trimmed.match(/^2\.\s*History\s*\((\d+)\)$/i);
  if (m) return lang === 'gu' ? `૨. ઇતિહાસ (${m[1]})` : `2. इतिहास (${m[1]})`;

  m = trimmed.match(/^3\.\s*Organizations\s*\((\d+)\)$/i);
  if (m) return lang === 'gu' ? `૩. સંસ્થાઓ (${m[1]})` : `3. संगठन (${m[1]})`;

  m = trimmed.match(/^2\.\s*Evidence\s*\((\d+)\)$/i);
  if (m) return lang === 'gu' ? `૨. પુરાવા (${m[1]})` : `2. साक्ष्य (${m[1]})`;

  m = trimmed.match(/^3\.\s*Certificates\s*\((\d+)\)$/i);
  if (m) return lang === 'gu' ? `૩. પ્રમાણપત્રો (${m[1]})` : `3. प्रमाणपत्र (${m[1]})`;

  m = trimmed.match(/^Workers\s*\((\d+)\)$/i);
  if (m) return lang === 'gu' ? `કામદારો (${m[1]})` : `कर्मचारी (${m[1]})`;

  m = trimmed.match(/^Sanitation Field Workers\s*\((\d+)\)$/i);
  if (m) return lang === 'gu' ? `સફાઈ કામદારો (${m[1]})` : `सफाई कर्मचारी (${m[1]})`;

  m = trimmed.match(/^Ward Officers\s*\((\d+)\)$/i);
  if (m) return lang === 'gu' ? `વોર્ડ અધિકારીઓ (${m[1]})` : `वार्ड अधिकारी (${m[1]})`;

  m = trimmed.match(/^Field Personnel Roster\s*\((\d+)\s*Workers\)$/i);
  if (m) return lang === 'gu' ? `ફિલ્ડ કર્મચારી યાદી (${m[1]} કામદારો)` : `फील्ड कर्मचारी सूची (${m[1]} कर्मचारी)`;

  m = trimmed.match(/^Refresh Certificates\s*\((\d+)\)$/i);
  if (m) return lang === 'gu' ? `પ્રમાણપત્રો રિફ્રેશ (${m[1]})` : `प्रमाणपत्र रिफ्रेश (${m[1]})`;

  m = trimmed.match(/^(\d+)\s+Active$/i);
  if (m) return lang === 'gu' ? `${m[1]} સક્રિય` : `${m[1]} सक्रिय`;

  m = trimmed.match(/^(\d+)\s+Resolved$/i);
  if (m) return lang === 'gu' ? `${m[1]} ઉકેલાયેલ` : `${m[1]} निस्तारित`;

  m = trimmed.match(/^(\d+)\s+Workers$/i);
  if (m) return lang === 'gu' ? `${m[1]} કામદારો` : `${m[1]} कर्मचारी`;

  m = trimmed.match(/^(\d+)\s+Members$/i);
  if (m) return lang === 'gu' ? `${m[1]} સભ્યો` : `${m[1]} सदस्य`;

  m = trimmed.match(/^(\d+)\s+Active Tasks$/i);
  if (m) return lang === 'gu' ? `${m[1]} સક્રિય કાર્યો` : `${m[1]} सक्रिय कार्य`;

  m = trimmed.match(/^(\d+)\s+Open Complaints$/i);
  if (m) return lang === 'gu' ? `${m[1]} બાકી ફરિયાદો` : `${m[1]} लंबित शिकायतें`;

  m = trimmed.match(/^Flagged\s*\((\d+)\)$/i);
  if (m) return lang === 'gu' ? `ફ્લેગ થયેલ (${m[1]})` : `फ़्लैग किया गया (${m[1]})`;

  m = trimmed.match(/^(\d+)\s+Ward Officers?\s+Flagged for SLA Breach$/i);
  if (m) {
    return lang === 'gu'
      ? `${m[1]} વોર્ડ અધિકારી SLA ઉલ્લંઘન માટે ફ્લેગ થયેલ`
      : `${m[1]} वार्ड अधिकारी SLA उल्लंघन के लिए फ़्लैग`;
  }

  return null;
}

const originalTextMap = new WeakMap<Text, string>();
const lastAppliedMap = new WeakMap<Text, string>();

const SKIP_TAGS = new Set(['SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'CODE', 'PRE', 'NOSCRIPT', 'SVG']);

function isInsideSkippedElement(node: Node): boolean {
  let el: HTMLElement | null = node.parentElement;
  while (el) {
    if (SKIP_TAGS.has(el.tagName)) return true;
    if (el.getAttribute('data-no-translate') === 'true' || el.classList.contains('no-translate')) {
      return true;
    }
    el = el.parentElement;
  }
  return false;
}

function translateTextNode(textNode: Text, lang: Language): void {
  if (isInsideSkippedElement(textNode)) return;
  const current = textNode.nodeValue;
  if (!current || !current.trim()) return;

  // If React updated this node's text to a fresh value different from what we last wrote,
  // refresh our recorded English source string.
  const prevApplied = lastAppliedMap.get(textNode);
  if (prevApplied !== current) {
    originalTextMap.set(textNode, current);
  }

  const original = originalTextMap.get(textNode) ?? current;

  if (lang === 'en') {
    if (current !== original) {
      lastAppliedMap.set(textNode, original);
      textNode.nodeValue = original;
    }
    return;
  }

  const leading = original.match(/^\s*/)?.[0] || '';
  const trailing = original.match(/\s*$/)?.[0] || '';
  const trimmed = original.trim();

  const exact = UI_PHRASES[trimmed];
  const translatedCore = exact ? exact[lang] : translateDynamicUiPattern(trimmed, lang);

  if (translatedCore) {
    const nextValue = `${leading}${translatedCore}${trailing}`;
    if (textNode.nodeValue !== nextValue) {
      lastAppliedMap.set(textNode, nextValue);
      textNode.nodeValue = nextValue;
    }
  }
}

function walkAndTranslate(root: Node, lang: Language): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    translateTextNode(node as Text, lang);
  }
}

let activeObserver: MutationObserver | null = null;
let currentLang: Language = 'en';
let scheduledFrame: number | null = null;

/**
 * Installs a lightweight MutationObserver that translates all dashboard UI headings,
 * KPI cards, tabs, table headers, labels, and buttons into the selected language,
 * while strictly preserving user-submitted descriptions & content in their original language.
 */
export function startDomTranslationSync(lang: Language): () => void {
  currentLang = lang;
  const root = document.getElementById('root') || document.body;

  walkAndTranslate(root, currentLang);

  if (activeObserver) {
    activeObserver.disconnect();
  }

  activeObserver = new MutationObserver(mutations => {
    if (currentLang === 'en') return;
    if (scheduledFrame !== null) return;

    scheduledFrame = window.requestAnimationFrame(() => {
      scheduledFrame = null;
      const targets = new Set<Node>();
      for (const m of mutations) {
        if (m.type === 'characterData' && m.target.nodeType === Node.TEXT_NODE) {
          translateTextNode(m.target as Text, currentLang);
        } else if (m.type === 'childList') {
          m.addedNodes.forEach(n => targets.add(n));
        }
      }
      targets.forEach(n => {
        if (n.nodeType === Node.TEXT_NODE) {
          translateTextNode(n as Text, currentLang);
        } else if (n.nodeType === Node.ELEMENT_NODE) {
          walkAndTranslate(n, currentLang);
        }
      });
    });
  });

  activeObserver.observe(root, {
    childList: true,
    subtree: true,
    characterData: true
  });

  return () => {
    if (scheduledFrame !== null) {
      window.cancelAnimationFrame(scheduledFrame);
      scheduledFrame = null;
    }
    if (activeObserver) {
      activeObserver.disconnect();
      activeObserver = null;
    }
  };
}
