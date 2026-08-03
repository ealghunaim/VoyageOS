/**
 * IATA airport table — every airport with a code and scheduled service.
 *
 * Shipped in the bundle rather than queried, for two reasons. Autocomplete
 * fires on every keystroke and AeroDataBox meters by API unit, so querying it
 * would meter typing — exactly the workload you cannot afford. And the
 * geocoder behind the wizard is a *city* database: typing "Sing" there returns
 * Singa in Sudan and Wan Sing in Myanmar long before Singapore, and it does
 * not index IATA codes at all, which is how a flight leg is actually written.
 *
 * Source: OurAirports (https://ourairports.com/data/), public domain.
 * Filtered to rows carrying an IATA code with scheduled_service = yes, then
 * sorted large airports first — that ordering is what makes a prefix search
 * surface Heathrow ahead of a regional strip.
 *
 * Stored as one delimited string rather than an array of objects: a third of
 * the size of the equivalent JSON, parsed once on first search and cached.
 */
export type Airport = { iata: string; name: string; city: string; cc: string };

const BLOB = `AAC|El Arish|El Arish|EG
AAE|Annaba Rabah Bitat|Annaba|DZ
AAL|Aalborg|Aalborg|DK
AAN|Al Ain|Al Ain|AE
AAR|Aarhus|Aarhus|DK
ABA|Abakan|Abakan|RU
ABB|Asaba|Asaba|NG
ABD|Abadan Ayatollah Jami|Abadan|IR
ABJ|Félix-Houphouët-Boigny|Abidjan|CI
ABQ|Albuquerque International Sunport|Albuquerque|US
ABV|Nnamdi Azikiwe|Abuja|NG
ABZ|Aberdeen|Aberdeen|GB
ACA|General Juan N. Álvarez|Acapulco|MX
ACC|Kotoka|Accra|GH
ACE|César Manrique-Lanzarote|San Bartolomé|ES
ADB|Adnan Menderes|Gaziemir|TR
ADD|Addis Ababa Bole|Addis Ababa|ET
ADE|Aden|Aden|YE
ADJ|Marka International (Amman Civil)|Amman|JO
ADL|Adelaide|Adelaide|AU
ADZ|Gustavo Rojas Pinilla|San Andrés|CO
AEP|Aeroparque Jorge Newbery|Buenos Aires|AR
AER|Sochi|Sochi|RU
AES|Ålesund|Ålesund|NO
AEY|Akureyri|Akureyri|IS
AGA|Al Massira|Agadir|MA
AGP|Málaga-Costa del Sol|Málaga|ES
AGT|Guaraní|Ciudad del Este|PY
AGU|Aguascalientes|Aguascalientes|MX
AHB|Abha|Abha|SA
AJF|Al-Jawf|Al-Jawf|SA
AKL|Auckland|Auckland|NZ
AKX|Aktobe|Aktobe|KZ
ALA|Almaty|Almaty|KZ
ALB|Albany|Albany|US
ALC|Alicante-Elche Miguel Hernández|Alicante|ES
ALG|Houari Boumediene|Algiers|DZ
ALP|Aleppo|Aleppo|SY
AMD|Sardar Vallabh Patel|Ahmedabad|IN
AMM|Queen Alia|Amman|JO
AMQ|Pattimura|Ambon|ID
AMS|Amsterdam Airport Schiphol|Amsterdam|NL
ANC|Ted Stevens Anchorage|Anchorage|US
ANF|Andrés Sabella Gálvez|Antofagasta|CL
ANU|V. C. Bird|Osbourn|AG
AOE|Hasan Polatkan|Eskişehir|TR
AOJ|Aomori|Aomori|JP
APL|Nampula|Nampula|MZ
APW|Faleolo|Apia|WS
AQI|Qaisumah–Hafar Al-Batin|Qaisumah|SA
AQJ|King Hussein|Aqaba|JO
AQP|Rodríguez Ballón|Arequipa|PE
ARN|Stockholm-Arlanda|Stockholm|SE
ASB|Ashgabat|Ashgabat|TM
ASF|Astrakhan Narimanovo Boris M. Kustodiev|Astrakhan|RU
ASR|Kayseri Erkilet|Kayseri|TR
ASU|Silvio Pettirossi|Asunción|PY
ASW|Aswan|Aswan|EG
ATH|Athens Eleftherios Venizelos|Spata-Artemida|GR
ATL|Hartsfield Jackson Atlanta|Atlanta|US
ATQ|Sri Guru Ram Das Ji|Amritsar|IN
ATZ|Asyut|Asyut|EG
AUA|Queen Beatrix|Oranjestad|AW
AUH|Zayed|Abu Dhabi|AE
AUS|Austin Bergstrom|Austin|US
AVV|Melbourne Avalon|Geelong/Melbourne|AU
AWA|Hawassa|Hawassa|ET
AWZ|Qasem Soleimani|Ahvaz|IR
AYT|Antalya|Antalya|TR
BAH|Bahrain|Manama|BH
BAQ|Ernesto Cortissoz|Barranquilla|CO
BAV|Baotou Donghe|Baotou|CN
BAX|Barnaul Gherman Titov|Barnaul|RU
BBI|Biju Patnaik|Bhubaneswar|IN
BBK|Kasane|Kasane|BW
BBU|Bucharest Băneasa Aurel Vlaicu|Bucharest|RO
BCD|Bacolod-Silay|Bacolod City|PH
BCM|Bacău George Enescu|Bacău|RO
BCN|Josep Tarradellas Barcelona-El Prat|Barcelona|ES
BCU|Sir Abubakar Tafawa Balewa Bauchi State|Bauchi|NG
BDA|L.F. Wade|Hamilton|BM
BDJ|Syamsudin Noor|Banjarbaru|ID
BDL|Bradley|Hartford|US
BDQ|Vadodara|Vadodara|IN
BDS|Brindisi|Brindisi|IT
BEG|Belgrade Nikola Tesla|Belgrade|RS
BEL|Val de Cans/Júlio Cezar Ribeiro|Belém|BR
BEM|Beni Mellal|Oulad Yaich|MA
BEN|Benina|Benina|LY
BER|Berlin Brandenburg|Berlin|DE
BES|Brest Bretagne airport|Brest|FR
BEW|Beira|Beira|MZ
BEY|Beirut Rafic Hariri|Beirut|LB
BFN|Bram Fischer|Bloemfontein|ZA
BFS|Belfast|Belfast|GB
BGF|Bangui M'Poko|Bangui|CF
BGI|Grantley Adams|Bridgetown|BB
BGO|Bergen Airport, Flesland|Bergen|NO
BGW|Baghdad International Airport / New Al Muthana Air Base|Baghdad|IQ
BGY|Il Caravaggio|Orio al Serio|IT
BHK|Bukhara|Bukhara|UZ
BHM|Birmingham-Shuttlesworth|Birmingham|US
BHO|Raja Bhoj|Bhopal|IN
BHX|Birmingham|Birmingham, West Midlands|GB
BIA|Bastia-Poretta International airport|Bastia|FR
BIO|Bilbao|Bilbao|ES
BJA|Soummam–Abane Ramdane|Béjaïa|DZ
BJL|Banjul|Banjul|GM
BJM|Bujumbura Melchior Ndadaye|Bujumbura|BI
BJV|Milas Bodrum|Bodrum|TR
BJX|Guanajuato|Silao|MX
BKI|Kota Kinabalu|Kota Kinabalu|MY
BKK|Suvarnabhumi|Bangkok|TH
BKO|Modibo Keita|Bamako|ML
BLA|General José Antonio Anzoategui|Barcelona|VE
BLJ|Batna Mostefa Ben Boulaid|Batna|DZ
BLL|Billund|Billund|DK
BLQ|Bologna Guglielmo Marconi|Bologna|IT
BLR|Kempegowda International Airport Bengaluru|Bengaluru|IN
BLZ|Chileka|Blantyre|MW
BME|Broome|Broome|AU
BNA|Nashville|Nashville|US
BND|Bandar Abbas|Bandar Abbas|IR
BNE|Brisbane|Brisbane|AU
BNX|Banja Luka|Mahovljani|BA
BOD|Bordeaux–Mérignac|Bordeaux|FR
BOG|El Dorado|Bogota|CO
BOI|Boise Air Terminal/Gowen Field|Boise|US
BOJ|Burgas|Burgas|BG
BOM|Chhatrapati Shivaji Maharaj|Mumbai|IN
BON|Flamingo|Kralendijk|BQ
BOO|Bodø|Bodø|NO
BOS|Boston Logan|Boston|US
BOY|Bobo Dioulasso|Bobo Dioulasso|BF
BPN|Sultan Aji Muhammad Sulaiman Sepinggan|Balikpapan|ID
BPS|Porto Seguro|Porto Seguro|BR
BQT|Brest|Brest|BY
BRC|Teniente Luis Candelaria|San Carlos de Bariloche|AR
BRE|Bremen|Bremen|DE
BRI|Bari Karol Wojtyła|Bari|IT
BRM|Jacinto Lara|Barquisimeto|VE
BRS|Bristol|Bristol|GB
BRU|Brussels|Zaventem|BE
BSA|Bender Qassim|Bosaso|SO
BSB|Presidente Juscelino Kubitschek|Brasília|BR
BSG|Bata|Bata|GQ
BSK|Biskra - Mohamed Khider|Biskra|DZ
BSL|EuroAirport Basel–Mulhouse–Freiburg|Bâle / Mulhouse|FR
BSR|Basra|Basra|IQ
BSZ|Manas|Bishkek|KG
BTH|Hang Nadim|Batam|ID
BTJ|Sultan Iskandar Muda|Banda Aceh|ID
BTS|M. R. Štefánik|Bratislava|SK
BUD|Budapest Liszt Ferenc|Budapest|HU
BUF|Buffalo Niagara|Buffalo|US
BUQ|Joshua Mqabuko Nkomo|Bulawayo|ZW
BUR|Hollywood Burbank/Bob Hope|Burbank|US
BUS|Alexander Kartveli Batumi|Batumi|GE
BVA|Beauvais-Tillé airport|Beauvais|FR
BVB|Atlas Brasil Cantanhede|Boa Vista|BR
BVC|Aristides Pereira|Rabil|CV
BWA|Gautam Buddha|Siddharthanagar|NP
BWI|Baltimore/Washington International Thurgood Marshall|Baltimore|US
BWN|Brunei|Bandar Seri Begawan|BN
BXY|Baikonur Krayniy|Baikonur|KZ
BZE|Philip S. W. Goldson|Belize City|BZ
BZV|Maya-Maya|Brazzaville|CG
CAG|Cagliari Elmas|Cagliari|IT
CAI|Cairo|Cairo|EG
CAN|Guangzhou Baiyun|Guangzhou|CN
CAP|Cap Haitien|Cap Haitien|HT
CAY|Cayenne – Félix Eboué|Matoury|GF
CBB|Jorge Wilsterman|Cochabamba|BO
CCJ|Calicut|Calicut|IN
CCK|Cocos (Keeling) Islands|West Island|CC
CCP|Carriel Sur|Concepcion|CL
CCS|Maiquetía Simón Bolívar|Maiquetía|VE
CCU|Netaji Subhash Chandra Bose|Kolkata|IN
CDG|Charles de Gaulle|Paris|FR
CEB|Mactan Cebu|Cebu City/Lapu-Lapu City|PH
CEI|Mae Fah Luang - Chiang Rai|Chiang Rai|TH
CEK|Kurchatov Chelyabinsk|Chelyabinsk|RU
CFE|Clermont-Ferrand Auvergne airport|Clermont-Ferrand|FR
CFK|Chlef Aboubakr Belkaid|Chlef|DZ
CFU|Corfu Ioannis Kapodistrias|Kerkyra|GR
CGB|Várzea Grande–Marechal Rondon|Cuiabá|BR
CGH|Congonhas–Deputado Freitas Nobre|São Paulo|BR
CGK|Soekarno-Hatta|Jakarta|ID
CGN|Cologne Bonn|Köln|DE
CGO|Zhengzhou Xinzheng|Zhengzhou|CN
CGP|Shah Amanat|Chattogram|BD
CGQ|Changchun Longjia|Changchun|CN
CGY|Laguindingan|Laguindingan|PH
CHC|Christchurch|Christchurch|NZ
CHQ|Chania|Souda|GR
CHS|Charleston|Charleston|US
CIA|Ciampino–G. B. Pastine|Rome|IT
CIT|Shymkent|Shymkent|KZ
CIX|Capitán FAP José A. Quiñones González|Chiclayo|PE
CJB|Coimbatore|Coimbatore|IN
CJJ|Cheongju International Airport/Cheongju Air Base (K-59/G-513)|Cheongju|KR
CJS|Abraham González|Ciudad Juárez|MX
CJU|Jeju|Jeju City|KR
CKG|Chongqing Jiangbei|Chongqing|CN
CKY|Ahmed Sékou Touré|Conakry|GN
CLE|Cleveland Hopkins|Cleveland|US
CLJ|Avram Iancu Cluj|Cluj-Napoca|RO
CLO|Alfonso Bonilla Aragon|Cali|CO
CLT|Charlotte Douglas|Charlotte|US
CMB|Bandaranaike International Colombo|Colombo|LK
CMH|John Glenn Columbus|Columbus|US
CMN|Mohammed V|Casablanca|MA
CMW|Ignacio Agramonte|Camaguey|CU
CND|Mihail Kogălniceanu|Constanța|RO
CNF|Tancredo Neves|Belo Horizonte|BR
CNN|Kannur|Kannur|IN
CNS|Cairns|Cairns|AU
CNX|Chiang Mai|Chiang Mai|TH
COK|Cochin|Kochi|IN
COO|Cotonou Cadjehoun|Cotonou|BJ
COR|Ingeniero Aeronáutico Ambrosio L.V. Taravella|Cordoba|AR
COS|City of Colorado Springs Municipal|Colorado Springs|US
COV|Çukurova|Tarsus|TR
CPH|Copenhagen Kastrup|Copenhagen|DK
CPT|Cape Town|Cape Town|ZA
CRA|Craiova|Craiova|RO
CRD|General Enrique Mosconi|Comodoro Rivadavia|AR
CRK|Clark International Airport / Clark Air Base|Mabalacat|PH
CRL|Brussels South Charleroi|Charleroi|BE
CRZ|Türkmenabat|Türkmenabat|TM
CSX|Changsha Huanghua|Changsha|CN
CTA|Catania-Fontanarossa|Catania|IT
CTG|Rafael Nuñez|Cartagena|CO
CTS|New Chitose|Sapporo|JP
CTU|Chengdu Shuangliu|Chengdu|CN
CUL|Bachigualato Federal|Culiacán|MX
CUN|Cancún|Cancún|MX
CUR|Hato|Willemstad|CW
CUU|General Roberto Fierro Villalobos|Chihuahua|MX
CUZ|Alejandro Velasco Astete|Cusco|PE
CVG|Cincinnati Northern Kentucky|Cincinnati / Covington|US
CWB|Curitiba-Afonso Pena|Curitiba|BR
CWL|Cardiff|Cardiff|GB
CXI|Cassidy|Kiritimati|KI
CXR|Cam Ranh International Airport / Cam Ranh Air Base|Nha Trang/nha Trang aiurportCam Ranh|VN
CZL|Mohamed Boudiaf|Constantine|DZ
CZM|Cozumel|Cozumel|MX
DAC|Hazrat Shahjalal|Dhaka|BD
DAD|Da Nang|Da Nang|VN
DAL|Dallas Love Field|Dallas|US
DAM|Damascus|Damascus|SY
DAR|Julius Nyerere|Dar es Salaam|TZ
DAT|Datong Yungang|Datong|CN
DBB|El Alamein|El Alamein|EG
DBV|Dubrovnik Ruđer Bošković|Dubrovnik|HR
DCA|Ronald Reagan Washington National|Washington|US
DEB|Debrecen|Debrecen|HU
DEL|Indira Gandhi|New Delhi|IN
DEN|Denver|Denver|US
DFW|Dallas Fort Worth|Dallas-Fort Worth|US
DIA|Doha|Doha|QA
DIL|Presidente Nicolau Lobato|Dili|TL
DIR|Aba Tenna Dejazmach Yilma|Dire Dawa|ET
DJE|Djerba Zarzis|Mellita|TN
DJG|Tiska Djanet|Djanet|DZ
DJJ|Dortheys Hiyo Eluay|Sentani|ID
DKR|Léopold Sédar Senghor|Dakar|SN
DLA|Douala|Douala|CM
DLC|Dalian Zhoushuizi|Dalian|CN
DLM|Dalaman|Dalaman|TR
DMB|Taraz|Taraz|KZ
DME|Domodedovo|Moscow|RU
DMK|Don Mueang|Bangkok|TH
DMM|King Fahd|Ad Dammam|SA
DNH|Dunhuang Mogao|Dunhuang|CN
DOH|Hamad|Doha|QA
DPS|Denpasar I Gusti Ngurah Rai|Kuta, Badung|ID
DQM|Duqm|Duqm|OM
DRP|Bicol|Legazpi|PH
DRS|Dresden|Dresden|DE
DRW|Darwin International Airport / RAAF Darwin|Darwin|AU
DSM|Des Moines|Des Moines|US
DSN|Ordos Ejin Horo|Ordos|CN
DSS|Blaise Diagne|Dakar|SN
DSY|Dara Sakor|Ta Noun|KH
DTM|Dortmund|Dortmund|DE
DTW|Detroit Metropolitan Wayne County|Detroit|US
DUB|Dublin|Dublin|IE
DUR|King Shaka|Durban|ZA
DUS|Düsseldorf|Düsseldorf|DE
DVO|Francisco Bangoy|Davao|PH
DWC|Al Maktoum|Dubai|AE
DXB|Dubai|Dubai|AE
DXN|Noida|Gautam Buddha Nagar|IN
DYG|Zhangjiajie Hehua|Zhangjiajie|CN
DYU|Dushanbe|Dushanbe|TJ
DZA|Dzaoudzi Pamandzi|Dzaoudzi|YT
DZN|Zhezkazgan National|Zhezkazgan|KZ
EBB|Entebbe|Entebbe|UG
EBL|Erbil|Arbil|IQ
ECN|Ercan|Tymbou|CY
EDI|Edinburgh|Ingliston, Edinburgh|GB
EDL|Eldoret|Eldoret|KE
EDO|Balıkesir Koca Seyit|Edremit|TR
EHU|Ezhou Huahu|Ezhou|CN
EIN|Eindhoven|Eindhoven|NL
EIS|Terrance B. Lettsome|Beef Island|VG
ELP|El Paso|El Paso|US
ELQ|Prince Naif bin Abdulaziz|Qassim|SA
ELS|King Phalo|East London|ZA
EMA|East Midlands|Nottingham, Leicestershire|GB
ENO|Teniente Ramon A. Ayub Gonzalez|Encarnación|PY
ENU|Akanu Ibiam|Enegu|NG
ERF|Erfurt-Weimar|Erfurt|DE
ESB|Esenboğa|Ankara|TR
ESM|Carlos Concha Torres|Tachina|EC
ETM|Ramon|Eilat|IL
EUN|Laayoune Hassan I|El Aaiún|EH
EVE|Harstad/Narvik|Evenes|NO
EVN|Zvartnots|Yerevan|AM
EWR|Newark Liberty|Newark|US
EZE|Ezeiza International Airport - Ministro Pistarini|Buenos Aires|AR
FAE|Vágar|Vágar|FO
FAO|Faro - Gago Coutinho|Faro|PT
FAT|Fresno Yosemite|Fresno|US
FBM|Lubumbashi|Lubumbashi|CD
FCO|Rome–Fiumicino Leonardo da Vinci|Rome|IT
FDF|Martinique Aimé Césaire|Fort-de-France|MQ
FDH|Bodensee Airport Friedrichshafen|Friedrichshafen|DE
FEZ|Fes Saïss|Saïss|MA
FIH|Ndjili|Kinshasa|CD
FJR|Fujairah|Fujairah|AE
FKB|Karlsruhe Baden-Baden|Rheinmünster|DE
FKI|Bangoka|Kisangani|CD
FLL|Fort Lauderdale Hollywood|Fort Lauderdale|US
FLN|Hercílio Luz|Florianópolis|BR
FLR|Florence Airport, Peretola|Firenze|IT
FMM|Memmingen Allgau|Memmingen|DE
FMO|Münster Osnabrück|Greven|DE
FNA|Lungi|Freetown|SL
FNC|Cristiano Ronaldo|Funchal|PT
FNJ|Pyongyang Sunan|Pyongyang|KP
FOC|Fuzhou Changle|Fuzhou|CN
FOR|Pinto Martins|Fortaleza|BR
FPO|Grand Bahama|Freeport|BS
FRA|Frankfurt Main|Frankfurt am Main|DE
FRW|Phillip Gaonwe Matante|Francistown|BW
FSC|Figari Sud-Corse|Figari|FR
FSZ|Mount Fuji Shizuoka|Makinohara / Shimada|JP
FUE|Fuerteventura|El Matorral|ES
FUK|Fukuoka|Fukuoka|JP
GAN|Gan|Gan|MV
GAU|Lokpriya Gopinath Bordoloi|Guwahati|IN
GBE|Sir Seretse Khama|Gaborone|BW
GCM|Owen Roberts|George Town|KY
GDL|Guadalajara|Guadalajara|MX
GDN|Gdańsk Lech Wałęsa|Gdańsk|PL
GEG|Spokane|Spokane|US
GEO|Cheddi Jagan|Georgetown|GY
GES|General Santos|General Santos|PH
GHV|Brașov-Ghimbav|Brașov|RO
GIB|Gibraltar|Gibraltar|GI
GIG|Rio Galeão – Tom Jobim|Rio De Janeiro|BR
GJL|Jijel Ferhat Abbas|Tahir|DZ
GLA|Glasgow|Glasgow|GB
GMP|Seoul Gimpo|Seoul|KR
GND|Maurice Bishop|Saint George's|GD
GNJ|Ganja|Ganja|AZ
GNY|Şanlıurfa GAP|Şanlıurfa|TR
GOA|Genoa Cristoforo Colombo|Genova|IT
GOH|Nuuk|Nuuk|GL
GOI|Goa Dabolim|Vasco da Gama|IN
GOJ|Nizhny Novgorod / Strigino|Nizhny Novgorod|RU
GOM|Goma|Goma|CD
GOT|Göteborg Landvetter|Göteborg|SE
GOU|Garoua|Garoua|CM
GOX|Manohar|Mopa|IN
GRJ|George|George|ZA
GRO|Girona-Costa Brava|Girona|ES
GRQ|Groningen Airport Eelde|Groningen|NL
GRR|Gerald R. Ford|Grand Rapids|US
GRU|São Paulo/Guarulhos–Governor André Franco Montoro|São Paulo|BR
GRV|Akhmat Kadyrov Grozny|Grozny|RU
GRZ|Graz|Feldkirchen bei Graz|AT
GSM|Qeshm|Qeshm|IR
GSO|Piedmont Triad|Greensboro|US
GSV|Gagarin|Saratov|RU
GUA|La Aurora|Guatemala City|GT
GUM|Antonio B. Won Pat|Hagåtña|GU
GUW|Atyrau|Atyrau|KZ
GVA|Geneva|Geneva|CH
GWD|New Gwadar|Gurandani|PK
GXF|Seiyun Hadhramaut|Seiyun|YE
GYD|Heydar Aliyev|Baku|AZ
GYE|José Joaquín de Olmedo|Guayaquil|EC
GYN|Santa Genoveva|Goiânia|BR
GZT|Gaziantep Oğuzeli|Gaziantep|TR
HAH|Prince Said Ibrahim|Moroni|KM
HAJ|Hannover|Hannover|DE
HAK|Haikou Meilan|Haikou|CN
HAM|Hamburg Helmut Schmidt|Hamburg|DE
HAN|Noi Bai|Hanoi|VN
HAQ|Hanimaadhoo|Haa Dhaalu Atoll|MV
HAS|Hail|Hail|SA
HAV|José Martí|Havana|CU
HBA|Hobart|Hobart|AU
HBE|Alexandria|Alexandria|EG
HDY|Hat Yai|Hat Yai|TH
HEA|Herat - Khwaja Abdullah Ansari|Guzara|AF
HEL|Helsinki Vantaa|Helsinki|FI
HER|Heraklion International Nikos Kazantzakis|Heraklion|GR
HET|Hohhot Baita|Hohhot|CN
HFE|Hefei Xinqiao|Hefei|CN
HGA|Egal|Hargeisa|SO
HGH|Hangzhou Xiaoshan|Hangzhou|CN
HHN|Frankfurt-Hahn|Frankfurt am Main|DE
HIA|Huai'an Lianshui|Huai'an|CN
HIJ|Hiroshima|Hiroshima|JP
HIR|Honiara|Honiara|SB
HKD|Hakodate|Hakodate|JP
HKG|Hong Kong|Hong Kong|HK
HKT|Phuket|Phuket|TH
HLA|Lanseria|Johannesburg|ZA
HLD|Hulunbuir Hailar|Hailar|CN
HLP|Halim Perdanakusuma|Jakarta|ID
HMB|Suhaj|Suhaj|EG
HMO|General Ignacio L. Pesqueira|Hermosillo|MX
HND|Tokyo Haneda|Tokyo|JP
HNL|Daniel K. Inouye|Honolulu, Oahu|US
HOF|Al-Ahsa|Hofuf|SA
HOG|Frank Pais|Holguin|CU
HOU|William P. Hobby|Houston|US
HPH|Cat Bi|Haiphong|VN
HRB|Harbin Taiping|Harbin|CN
HRE|Robert Gabriel Mugabe|Harare|ZW
HRG|Hurghada|Hurghada|EG
HSA|Hazrat Sultan|Turkıstan|KZ
HSG|Kyushu Saga|Saga|JP
HSN|Zhoushan Putuoshan|Zhoushan|CN
HSR|Rajkot|Rajkot|IN
HSS|Maharaja Agrasen|Hisar|IN
HTA|Chita-Kadala|Chita|RU
HUN|Hualien Chiashan|Hualien City|TW
HUX|Bahías de Huatulco|Huatulco|MX
HWR|Halwara|Halwara|IN
HYD|Rajiv Gandhi|Hyderabad|IN
IAD|Washington Dulles|Dulles|US
IAH|George Bush Intercontinental|Houston|US
IAR|Golden Ring Yaroslavl|Tunoshna|RU
IAS|Iaşi|Iaşi|RO
IBR|Ibaraki|Omitama|JP
IBZ|Ibiza|Ibiza|ES
ICN|Incheon|Seoul|KR
IDR|Devi Ahilya Bai Holkar|Indore|IN
IFN|Isfahan Shahid Beheshti|Isfahan|IR
IGU|Cataratas|Foz do Iguaçu|BR
IKA|Imam Khomeini|Tehran|IR
IKT|Irkutsk|Irkutsk|RU
IKU|Issyk-Kul|Tamchy|KG
ILO|Iloilo|Cabatuan|PH
ILR|General Tunde Idiagbon|Ilorin/Ogbomosho|NG
IMF|Bir Tikendrajit|Imphal|IN
INC|Yinchuan Hedong|Yinchuan|CN
IND|Indianapolis|Indianapolis|US
INI|Niš Constantine the Great|Niš|RS
INN|Innsbruck|Innsbruck|AT
IOM|Isle of Man|Castletown|IM
IPC|Mataveri|Isla De Pascua|CL
IPH|Sultan Azlan Shah|Ipoh|MY
IQQ|Diego Aracena|Iquique|CL
IQT|Coronel FAP Francisco Secada Vignetta|Iquitos|PE
ISB|Islamabad|Attock|PK
ISK|Nashik|Nashik|IN
IST|İstanbul|Istanbul|TR
ITM|Osaka Itami|Osaka|JP
IVL|Ivalo|Ivalo|FI
IXB|Bagdogra|Siliguri|IN
IXC|Shaheed Bhagat Singh|Chandigarh|IN
IXE|Mangaluru|Mangaluru|IN
IXZ|Veer Savarkar International Airport / INS Utkrosh|Port Blair|IN
JAF|Jaffna|Jaffna|LK
JAI|Jaipur|Jaipur|IN
JAX|Jacksonville|Jacksonville|US
JCL|České Budějovice South Bohemian|České Budějovice|CZ
JED|King Abdulaziz|Jeddah|SA
JFK|John F. Kennedy|New York|US
JGN|Jiayuguan|Jiayuguan|CN
JHB|Senai|Johor Bahru|MY
JHG|Xishuangbanna Gasa|Jinghong|CN
JIB|Djibouti-Ambouli|Djibouti City|DJ
JIJ|Gerad Wilwal|Jijiga|ET
JJN|Quanzhou Jinjiang|Quanzhou|CN
JNB|O.R. Tambo|Johannesburg|ZA
JPA|Presidente Castro Pinto|João Pessoa|BR
JRO|Kilimanjaro|Arusha|TZ
JTR|Santorini|Santorini Island|GR
JUB|Juba|Juba|SS
JUJ|Gobernador Horacio Guzman|San Salvador de Jujuy|AR
JUL|Inca Manco Capac|Juliaca|PE
KAD|Kaduna|Kaduna|NG
KAN|Mallam Aminu Kano|Kano|NG
KBL|Kabul|Kabul|AF
KBV|Krabi|Krabi|TH
KCH|Kuching|Kuching|MY
KCZ|Kochi Ryoma|Nankoku|JP
KDH|Ahmad Shah Baba|Kandahar|AF
KDU|Skardu|Skardu|PK
KEF|Keflavik|Reykjavík|IS
KEJ|Alexei Leonov Kemerovo|Kemerovo|RU
KER|Ayatollah Hashemi Rafsanjani|Kerman|IR
KGD|Khrabrovo|Kaliningrad|RU
KGF|Sary-Arka|Karaganda|KZ
KGL|Kigali|Kigali|RW
KGS|Kos International Airport "Ippokratis"|Kos Island|GR
KHG|Kashgar Laining|Kashgar|CN
KHH|Kaohsiung|Kaohsiung|TW
KHI|Jinnah|Karachi|PK
KHN|Nanchang Changbei|Nanchang|CN
KIH|Kish|Kish Island|IR
KIJ|Niigata|Niigata|JP
KIK|Kirkuk|Kirkuk|IQ
KIM|Kimberley|Kimberley|ZA
KIN|Norman Manley|Kingston|JM
KIS|Kisumu|Kisumu|KE
KIX|Kansai|Osaka|JP
KJA|Krasnoyarsk|Krasnoyarsk|RU
KKJ|Kitakyushu|Kitakyushu|JP
KLO|Kalibo|Kalibo|PH
KLU|Klagenfurt|Klagenfurt am Wörthersee|AT
KLV|Karlovy Vary|Karlovy Vary|CZ
KMG|Kunming Changshui|Kunming|CN
KMI|Miyazaki|Miyazaki|JP
KMJ|Kumamoto|Kumamoto|JP
KMQ|Komatsu Airport / JASDF Komatsu Air Base|Kanazawa|JP
KMS|Prempeh I|Kumasi|GH
KNO|Kualanamu|Beringin|ID
KOA|Ellison Onizuka Kona International Airport at Keāhole|Kailua-Kona|US
KOJ|Kagoshima|Kagoshima|JP
KOS|Sihanouk|Preah Sihanouk|KH
KOV|Kokshetau|Kokshetau|KZ
KQT|Bokhtar|Bokhtar|TJ
KRK|Kraków John Paul II|Balice|PL
KRN|Kiruna|Kiruna|SE
KRR|Krasnodar Pashkovsky|Krasnodar|RU
KRS|Kristiansand|Kristiansand|NO
KRT|Khartoum|Khartoum|SD
KSA|Kosrae|Okat|FM
KSF|Kassel|Calden|DE
KSN|Kostanay|Kostanay|KZ
KTI|Techo|Phnom Penh|KH
KTM|Tribhuvan|Kathmandu|NP
KTT|Kittilä|Kittilä|FI
KTW|Katowice Wojciech Korfanty|Katowice|PL
KUF|Kurumoch|Samara|RU
KUL|Kuala Lumpur|Sepang|MY
KUN|Kaunas|Kaunas|LT
KUO|Kuopio|Kuopio / Siilinjärvi|FI
KUT|David the Builder Kutaisi|Kopitnari|GE
KVA|Kavala Alexander the Great|Kavala|GR
KWE|Guiyang Longdongbao|Guiyang|CN
KWI|Kuwait|Kuwait City|KW
KWL|Guilin Liangjiang|Guilin|CN
KYA|Konya|Konya|TR
KZN|Kazan|Kazan|RU
KZO|Korkyt Ata|Kyzylorda|KZ
LAD|Quatro de Fevereiro|Luanda|AO
LAE|Nadzab Tomodachi|Lae|PG
LAO|Laoag|Laoag City|PH
LAQ|Al Abraq|Al Albraq|LY
LAS|Harry Reid|Las Vegas|US
LAX|Los Angeles|Los Angeles|US
LBA|Leeds Bradford|Leeds, West Yorkshire|GB
LBD|Khujand|Khujand|TJ
LBG|Paris-Le Bourget|Paris|FR
LBV|Libreville Leon M'ba|Libreville|GA
LCA|Larnaca|Larnaca|CY
LCJ|Łódź Władysław Reymont|Łódź|PL
LED|Pulkovo|St. Petersburg|RU
LEJ|Leipzig/Halle|Schkeuditz|DE
LFW|Lomé–Tokoin|Lomé|TG
LGA|LaGuardia|New York|US
LGB|Long Beach|Long Beach|US
LGK|Langkawi|Langkawi|MY
LGW|London Gatwick|London|GB
LHE|Allama Iqbal|Lahore|PK
LHR|London Heathrow|London|GB
LHW|Lanzhou Zhongchuan|Lanzhou|CN
LIH|Lihue|Lihue, Kauai|US
LIL|Lille|Lesquin|FR
LIM|Jorge Chávez|Lima|PE
LIN|Milano Linate|Segrate|IT
LIR|Daniel Oduber Quirós|Liberia|CR
LIS|Lisbon Humberto Delgado|Lisbon|PT
LJG|Lijiang Sanyi|Lijiang|CN
LJU|Ljubljana Jože Pučnik|Zgornji Brnik|SI
LKO|Chaudhary Charan Singh|Lucknow|IN
LLA|Luleå|Luleå|SE
LLW|Kamuzu|Lumbadzi|MW
LNZ|Linz-Hörsching|Linz|AT
LOP|Lombok|Mataram|ID
LOS|Murtala Muhammed|Lagos|NG
LPA|Gran Canaria|Gran Canaria Island|ES
LPB|El Alto|La Paz / El Alto|BO
LPI|Linköping City|Linköping|SE
LPL|Liverpool John Lennon|Liverpool|GB
LPP|Lappeenranta|Lappeenranta|FI
LPQ|Luang Phabang|Luang Phabang|LA
LRM|Casa De Campo|La Romana|DO
LTN|London Luton|Luton, Luton|GB
LTO|Loreto|Loreto|MX
LUN|Kenneth Kaunda|Lusaka|ZM
LUX|Luxembourg-Findel|Luxembourg|LU
LUZ|Lublin|Lublin|PL
LVI|Harry Mwanga Nkumbula|Livingstone|ZM
LWN|Shirak|Gyumri|AM
LWO|Lviv|Lviv|UA
LXA|Lhasa Gonggar|Shannan|CN
LXR|Luxor|Luxor|EG
LYA|Luoyang Beijiao|Luoyang|CN
LYG|Lianyungang Huaguoshan|Lianyungang|CN
LYP|Faisalabad|Faisalabad|PK
LYS|Lyon Saint-Exupéry|Colombier-Saugnieu, Rhône|FR
MAA|Chennai|Chennai|IN
MAD|Adolfo Suárez Madrid–Barajas|Madrid|ES
MAH|Menorca|Mahón|ES
MAJ|Marshall Islands|Majuro Atoll|MH
MAN|Manchester|Manchester, Greater Manchester|GB
MAO|Eduardo Gomes|Manaus|BR
MAR|La Chinita|Maracaibo|VE
MBA|Moi|Mombasa|KE
MBJ|Sangster|Montego Bay|JM
MCI|Kansas City|Kansas City|US
MCO|Orlando|Orlando|US
MCT|Muscat|Muscat/Seeb|OM
MCX|Makhachkala Uytash|Makhachkala|RU
MCY|Sunshine Coast|Maroochydore|AU
MCZ|Zumbi dos Palmares|Maceió|BR
MDC|Sam Ratulangi|Manado|ID
MDE|Jose Maria Córdova|Medellín|CO
MDL|Mandalay|Mandalay|MM
MDW|Chicago Midway|Chicago|US
MDZ|Governor Francisco Gabrielli|Mendoza|AR
MED|Prince Mohammad Bin Abdulaziz|Medina|SA
MEL|Melbourne|Melbourne|AU
MEM|Memphis|Memphis|US
MEX|Mexico City Benito Juárez|Mexico City|MX
MFM|Macau|Nossa Senhora do Carmo|MO
MFU|Mfuwe|Mfuwe|ZM
MGA|Augusto C. Sandino (Managua)|Managua|NI
MGQ|Aden Adde|Mogadishu|SO
MHD|Mashhad|Mashhad|IR
MIA|Miami|Miami|US
MID|Manuel Crescencio Rejón|Mérida|MX
MIU|Maiduguri|Maiduguri|NG
MJI|Mitiga|Tripoli|LY
MJN|Amborovy|Mahajanga|MG
MKE|General Mitchell|Milwaukee|US
MLA|Malta|Valletta|MT
MLE|Velana|Malé|MV
MLM|General Francisco J. Mujica|Morelia|MX
MMK|Emperor Nicholas II Murmansk|Murmansk|RU
MMX|Malmö Sturup|Malmö|SE
MNI|John A. Osborne|Gerald's Park|MS
MNL|Ninoy Aquino|Manila|PH
MPL|Montpellier-Méditerranée|Montpellier/Méditerranée|FR
MPM|Maputo|Maputo|MZ
MPN|Mount Pleasant Airport / RAF Mount Pleasant|Mount Pleasant|FK
MQF|Magnitogorsk|Magnitogorsk|RU
MQP|Kruger Mpumalanga|Mbombela|ZA
MRS|Marseille Provence|Marignane, Bouches-du-Rhône|FR
MRU|Sir Seewoosagur Ramgoolam|Plaine Magnien|MU
MRV|Mineralnye Vody|Mineralnyye Vody|RU
MSP|Minneapolis–Saint Paul International Airport / Wold–Chamberlain Field|Minneapolis|US
MSQ|Minsk National|Minsk|BY
MST|Maastricht Aachen|Maastricht|NL
MSU|Moshoeshoe I|Maseru|LS
MSY|Louis Armstrong New Orleans|New Orleans|US
MTY|Monterrey|Monterrey|MX
MUB|Maun|Maun|BW
MUC|Munich|Munich|DE
MUH|Mersa Matruh|Marsa Matruh|EG
MUX|Multan|Multan|PK
MVD|Carrasco General Cesáreo L. Berisso|Ciudad de la Costa|UY
MWX|Muan|Muan|KR
MWZ|Mwanza|Mwanza|TZ
MXP|Milan Malpensa|Ferno|IT
MYJ|Matsuyama|Matsuyama|JP
MYR|Myrtle Beach|Myrtle Beach|US
MZG|Penghu Magong|Huxi|TW
MZR|Mazar-i-Sharif|Mazar-i-Sharif|AF
MZT|General Rafael Buelna|Mazatlàn|MX
NAG|Dr. Babasaheb Ambedkar|Nagpur|IN
NAJ|Nakhchivan|Nakhchivan|AZ
NAN|Nadi|Nadi|FJ
NAP|Naples|Napoli|IT
NAS|Lynden Pindling|Nassau|BS
NAT|Rio Grande do Norte/São Gonçalo do Amarante–Governador Aluízio Alves|Natal|BR
NAV|Nevşehir Kapadokya|Nevşehir|TR
NBJ|Dr. Antonio Agostinho Neto|Luanda|AO
NBO|Jomo Kenyatta|Nairobi|KE
NCE|Nice-Côte d'Azur|Nice, Alpes-Maritimes|FR
NCL|Newcastle|Newcastle upon Tyne, Tyne and Wear|GB
NCU|Nukus|Nukus|UZ
NDB|Nouadhibou|Nouadhibou|MR
NDG|Qiqihar Sanjiazi|Qiqihar|CN
NDJ|N'Djamena|N'Djamena|TD
NDR|Nador Al Aaroui|Al Aaroui|MA
NGB|Ningbo Lishe|Ningbo|CN
NGO|Chubu Centrair|Tokoname|JP
NGS|Nagasaki|Nagasaki|JP
NIM|Diori Hamani|Niamey|NE
NJC|Nizhnevartovsk|Nizhnevartovsk|RU
NJF|Al Najaf|Najaf|IQ
NKC|Nouakchott–Oumtounsy|Nouakchott|MR
NKG|Nanjing Lukou|Nanjing|CN
NLA|Simon Mwansa Kapwepwe|Ndola|ZM
NLU|Felipe Ángeles|Mexico City|MX
NMA|Namangan|Namangan|UZ
NMI|Navi Mumbai|Navi Mumbai|IN
NNG|Nanning Wuxu|Nanning|CN
NOC|Ireland West Airport Knock|Charlestown|IE
NOS|Nosy Be|Nosy Be|MG
NOU|La Tontouta|Nouméa|NC
NQN|Presidente Perón|Neuquén|AR
NQZ|Nursultan Nazarbayev|Astana|KZ
NRN|Weeze (Niederrhein)|Weeze|DE
NRT|Narita|Narita|JP
NSI|Yaoundé Nsimalen|Yaoundé|CM
NSK|Alykel|Norilsk|RU
NTL|Newcastle|Williamtown|AU
NUE|Nuremberg|Nuremberg|DE
NUM|Neom Bay|Sharma|SA
NVT|Ministro Victor Konder|Navegantes|BR
NYO|Stockholm Skavsta|Nyköping|SE
NYT|Nay Pyi Taw|Naypyitaw|MM
OAK|Oakland San Francisco Bay|Oakland|US
OAX|Xoxocotlán|Oaxaca|MX
OCS|Corisco|Corisco Island|GQ
ODE|Odense Hans Christian Andersen|Odense|DK
OEC|Oecusse Route of the Sandalwood|Oecussi-Ambeno|TL
OGG|Kahului|Kahului|US
OHD|Ohrid St. Paul the Apostle|Ohrid|MK
OHS|Suhar|Suhar|OM
OKA|Naha|Naha|JP
OKC|OKC Will Rogers World|Oklahoma City|US
OKJ|Okayama Momotaro|Okayama|JP
OLB|Olbia Costa Smeralda|Olbia|IT
OMA|Eppley|Omaha|US
OMO|Mostar|Mostar|BA
OMR|Oradea|Oradea|RO
OMS|Omsk Central|Omsk|RU
ONT|Ontario|Ontario|US
OOL|Gold Coast|Gold Coast|AU
OPO|Francisco de Sá Carneiro|Porto|PT
ORD|Chicago O'Hare|Chicago|US
ORF|Norfolk|Norfolk|US
ORK|Cork|Cork|IE
ORN|Oran Es-Sénia (Ahmed Ben Bella)|Es-Sénia|DZ
ORU|Juan Mendoza|Oruro|BO
ORY|Paris-Orly|Paris|FR
OSL|Oslo-Gardermoen|Oslo|NO
OSR|Leoš Janáček Airport Ostrava|Mošnov|CZ
OSS|Osh|Osh|KG
OST|Ostend-Bruges|Oostende|BE
OTP|Bucharest Henri Coandă|Otopeni|RO
OUA|Ouagadougou Thomas Sankara|Ouagadougou|BF
OUD|Oujda Angads|Ahl Angad|MA
OUL|Oulu|Oulu / Oulunsalo|FI
OVB|Novosibirsk Tolmachevo|Novosibirsk|RU
OVD|Asturias|Ranón|ES
OXB|Osvaldo Vieira|Bissau|GW
OZG|Zagora|Zagora|MA
OZZ|Ouarzazate|Ouarzazate|MA
PAD|Paderborn Lippstadt|Büren|DE
PAP|Toussaint Louverture|Port-au-Prince|HT
PBC|Hermanos Serdán|Puebla|MX
PBH|Paro|Paro|BT
PBI|President Donald J. Trump|West Palm Beach|US
PBM|Johan Adolf Pengel|Paramaribo|SR
PCL|Cap FAP David Abenzur Rengifo|Pucallpa|PE
PDG|Minangkabau|Padang|ID
PDL|João Paulo II|Ponta Delgada|PT
PDV|Plovdiv|Plovdiv|BG
PDX|Portland|Portland|US
PED|Pardubice|Pardubice|CZ
PEE|Perm|Perm|RU
PEG|Perugia San Francesco d'Assisi – Umbria|Perugia|IT
PEK|Beijing Capital|Beijing|CN
PEN|Penang|Penang|MY
PER|Perth|Perth|AU
PEV|Pécs-Pogány|Pécs|HU
PEW|Bacha Khan|Peshawar|PK
PFO|Paphos|Paphos|CY
PHC|Port Harcourt|Port Harcourt|NG
PHE|Port Hedland|Port Hedland|AU
PHH|Pokhara|Pokhara|NP
PHL|Philadelphia|Philadelphia|US
PHX|Phoenix Sky Harbor|Phoenix|US
PIE|St. Petersburg Clearwater|Pinellas Park|US
PIK|Glasgow Prestwick|Prestwick, South Ayrshire|GB
PIT|Pittsburgh|Pittsburgh|US
PKC|Yelizovo|Petropavlovsk-Kamchatsky|RU
PKX|Beijing Daxing|Beijing|CN
PKZ|Pakse|Pakse|LA
PLQ|Palanga|Palanga|LT
PLS|Providenciales|Providenciales|TC
PLX|Semei|Semey|KZ
PLZ|Chief Dawid Stuurman|Gqeberha|ZA
PMC|El Tepual|Puerto Montt|CL
PMI|Palma de Mallorca|Palma de Mallorca|ES
PMO|Falcone–Borsellino|Palermo|IT
PMV|Del Caribe Santiago Mariño|Isla Margarita|VE
PNK|Supadio|Pontianak|ID
PNQ|Pune|Pune|IN
PNR|Antonio Agostinho-Neto|Pointe Noire|CG
PNS|Pensacola|Pensacola|US
POA|Porto Alegre-Salgado Filho|Porto Alegre|BR
POG|Port Gentil|Port Gentil|GA
POM|Port Moresby Jacksons|Port Moresby|PG
POS|Piarco|Port of Spain|TT
POZ|Poznań-Ławica|Poznań|PL
PPG|Pago Pago|Pago Pago|AS
PPK|Petropavl|Petropavl|KZ
PPS|Puerto Princesa International Airport / PAF Antonio Bautista Air Base|Puerto Princesa|PH
PPT|Fa'a'ā|Papeete|PF
PQC|Phú Quốc|Phu Quoc Island|VN
PRG|Václav Havel Airport Prague|Prague|CZ
PRN|Priština Adem Jashari|Prishtina|XK
PSA|Pisa|Pisa|IT
PSD|Port Said|Port Said|EG
PSP|Palm Springs|Palm Springs|US
PSR|Abruzzo|Pescara|IT
PTG|Polokwane|Polokwane|ZA
PTP|Maryse Condé|Pointe-à-Pitre|GP
PTY|Tocumen|Tocumen|PA
PUJ|Punta Cana|Punta Cana|DO
PUQ|President Carlos Ibáñez|Punta Arenas|CL
PUS|Gimhae|Busan|KR
PUY|Pula|Pula|HR
PVD|Rhode Island T. F. Green|Providence/Warwick|US
PVG|Shanghai Pudong|Shanghai|CN
PVH|Governador Jorge Teixeira de Oliveira|Porto Velho|BR
PVR|Puerto Vallarta|Puerto Vallarta|MX
PWM|Portland International Jetport|Portland|US
PWQ|Pavlodar|Pavlodar|KZ
PYK|Payam|Karaj|IR
PZO|General Manuel Carlos Piar|Guyana City|VE
PZU|Port Sudan New|Port Sudan|SD
QRO|Querétaro Intercontinental|Querétaro|MX
RAI|Nelson Mandela|Praia|CV
RAK|Marrakesh Menara|Marrakesh|MA
RAR|Rarotonga|Avarua|CK
RBA|Rabat-Salé|Rabat|MA
RBR|Rio Branco-Plácido de Castro|Rio Branco|BR
RDU|Raleigh-Durham|Raleigh/Durham|US
REC|Recife/Guararapes - Gilberto Freyre|Recife|BR
RES|Resistencia|Resistencia|AR
REU|Reus|Reus|ES
RGL|Piloto Civil Norberto Fernández|Rio Gallegos|AR
RGN|Yangon|Yangon|MM
RHO|Rhodes International Airport "Diagoras"|Rhodes|GR
RIC|Richmond|Richmond|US
RIX|Riga|Riga|LV
RIY|Riyan|Mukalla|YE
RJK|Rijeka|Rijeka|HR
RKT|Ras Al Khaimah|Ras Al Khaimah|AE
RKZ|Xigaze Peace Airport / Shigatse Air Base|Xigazê|CN
RMF|Marsa Alam|Marsa Alam|EG
RMI|Federico Fellini|Rimini|IT
RML|Colombo Ratmalana|Colombo|LK
RMO|Chişinău|Chişinău|MD
RMQ|Taichung International Airport / Ching Chuang Kang Air Base|Taichung|TW
RMU|Region of Murcia|Corvera|ES
RNO|Reno Tahoe|Reno|US
ROB|Roberts|Monrovia|LR
ROC|Frederick Douglass Greater Rochester|Rochester|US
ROP|Rota|Rota Island|MP
ROR|Roman Tmetuchl|Babelthuap Island|PW
ROS|Rosario Islas Malvinas|Rosario|AR
ROV|Platov|Rostov-on-Don|RU
RSI|Red Sea|Hanak|SA
RSW|Southwest Florida|Fort Myers|US
RTB|Juan Manuel Gálvez|Coxen Hole|HN
RTM|Rotterdam The Hague|Rotterdam|NL
RUH|King Khalid|Riyadh|SA
RUN|Roland Garros|Sainte-Marie|RE
RVN|Rovaniemi|Rovaniemi|FI
RZE|Rzeszów-Jasionka|Jasionka|PL
RZV|Rize–Artvin|Rize|TR
SAG|Shirdi|Kakadi|IN
SAH|Sanaa|Sanaa|YE
SAI|Siem Reap-Angkor|Siem Reap|KH
SAL|El Salvador International Airport Saint Óscar Arnulfo Romero y Galdámez|San Salvador|SV
SAN|San Diego|San Diego|US
SAP|Ramón Villeda Morales|San Pedro Sula|HN
SAT|San Antonio|San Antonio|US
SAV|Savannah Hilton Head|Savannah|US
SAW|Istanbul Sabiha Gökçen|Pendik, Istanbul|TR
SBD|San Bernardino|San Bernardino|US
SBZ|Sibiu|Sibiu|RO
SCL|Comodoro Arturo Merino Benítez|Santiago|CL
SCO|Aktau|Aktau|KZ
SCQ|Santiago-Rosalía de Castro|Santiago de Compostela|ES
SCR|Scandinavian Mountains|Malung-Sälen|SE
SCU|Antonio Maceo|Santiago|CU
SCV|Suceava Ștefan cel Mare|Suceava|RO
SDF|Louisville Muhammad Ali|Louisville|US
SDJ|Sendai|Natori|JP
SDQ|Las Américas|Santo Domingo|DO
SDU|Santos Dumont|Rio de Janeiro|BR
SEA|Seattle–Tacoma|Seattle|US
SEZ|Seychelles|Victoria|SC
SFB|Orlando Sanford|Orlando|US
SFO|San Francisco|San Francisco|US
SFS|Subic Bay International Airport / Naval Air Station Cubi Point|Olongapo|PH
SGC|Surgut|Surgut|RU
SGN|Tan Son Nhat|Ho Chi Minh City|VN
SHA|Shanghai Hongqiao|Shanghai|CN
SHE|Shenyang Taoxian|Shenyang|CN
SHJ|Sharjah|Sharjah|AE
SHO|King Mswati III|Mpaka|SZ
SID|Amílcar Cabral|Espargos|CV
SIN|Singapore Changi|Singapore|SG
SIP|Simferopol|Simferopol|UA
SJC|Norman Y. Mineta San Jose|San Jose|US
SJD|Los Cabos|San José del Cabo|MX
SJJ|Sarajevo|Sarajevo|BA
SJO|Juan Santamaría|San José|CR
SJU|Luis Munoz Marin|San Juan|PR
SJW|Shijiazhuang Zhengding|Shijiazhuang|CN
SKB|Robert L. Bradshaw|Basseterre|KN
SKD|Samarkand|Samarkand|UZ
SKG|Thessaloniki Macedonia|Thessaloniki|GR
SKO|Sadiq Abubakar III|Sokoto|NG
SKP|Skopje|Ilinden|MK
SKT|Sialkot|Sialkot|PK
SKX|Saransk|Saransk|RU
SLA|Martín Miguel de Güemes|Salta|AR
SLC|Salt Lake City|Salt Lake City|US
SLL|Salalah|Salalah|OM
SLZ|Marechal Cunha Machado|São Luís|BR
SMF|Sacramento|Sacramento|US
SNA|John Wayne Orange County|Santa Ana|US
SNC|General Ulpiano Paez|Salinas/La Libertad|EC
SNN|Shannon|Shannon|IE
SNU|Abel Santamaria|Santa Clara|CU
SOC|Adisoemarmo|Surakarta|ID
SOF|Sofia|Sofia|BG
SPU|Split Saint Jerome|Split|HR
SPX|Sphinx|Al Jiza|EG
SRE|Alcantarí|Sucre|BO
SRG|Jenderal Ahmad Yani|Semarang|ID
SRQ|Sarasota Bradenton|Sarasota/Bradenton|US
SSA|Deputado Luiz Eduardo Magalhães|Salvador|BR
SSG|Malabo|Malabo|GQ
SSH|Sharm El Sheikh|Sharm El Sheikh|EG
STI|Cibao|Santiago|DO
STL|St. Louis Lambert|St Louis|US
STN|London Stansted|London, Essex|GB
STR|Stuttgart|Stuttgart|DE
STT|Cyril E. King|Charlotte Amalie|VI
STV|Surat|Surat|IN
SUB|Juanda|Surabaya|ID
SUF|Lamezia Terme Sant'Eufemia|Lamezia Terme|IT
SUV|Nausori|Nausori|FJ
SVD|Argyle|Kingstown|VC
SVG|Stavanger Airport, Sola|Stavanger|NO
SVO|Sheremetyevo|Moscow|RU
SVQ|Seville|Seville|ES
SVX|Koltsovo|Yekaterinburg|RU
SWA|Jieyang Chaoshan|Jieyang|CN
SXB|Strasbourg|Strasbourg|FR
SXM|Princess Juliana|Sint Maarten|SX
SXR|Sheikh ul Alam|Srinagar|IN
SYD|Sydney Kingsford Smith|Sydney|AU
SYR|Syracuse Hancock|Syracuse|US
SYX|Sanya Phoenix|Sanya|CN
SYZ|Shiraz Shahid Dastghaib|Shiraz|IR
SZB|Sultan Abdul Aziz Shah|Subang|MY
SZG|Salzburg|Salzburg|AT
SZX|Shenzhen Bao'an|Shenzhen|CN
SZZ|Solidarity Szczecin–Goleniów|Szczecin|PL
TAB|A.N.R. Robinson|Scarborough|TT
TAE|Daegu|Daegu|KR
TAG|Bohol-Panglao|Panglao|PH
TAK|Takamatsu|Takamatsu|JP
TAO|Qingdao Jiaodong|Qingdao|CN
TAS|Tashkent|Tashkent|UZ
TAZ|Dashoguz|Daşoguz|TM
TBS|Tbilisi|Tbilisi|GE
TBU|Fua'amotu|Nuku'alofa|TO
TBZ|Tabriz|Tabriz|IR
TET|Tete|Tete|MZ
TFN|Tenerife Norte-Ciudad de La Laguna|Tenerife|ES
TFS|Tenerife Sur|Tenerife|ES
TFU|Chengdu Tianfu|Chengdu|CN
TGD|Podgorica Airport / Podgorica Golubovci Airbase|Podgorica|ME
THR|Mehrabad|Tehran|IR
TIA|Tirana International Airport Mother Teresa|Rinas|AL
TIF|Taif|Taif|SA
TIJ|General Abelardo L. Rodriguez|Tijuana|MX
TIR|Tirupati|Tirupati|IN
TJM|Roshchino|Tyumen|RU
TJU|Kulob|Kulob|TJ
TKK|Chuuk|Weno Island|FM
TKS|Tokushima Awaodori Airport / JMSDF Tokushima Air Base|Tokushima|JP
TKU|Turku|Turku|FI
TLC|Adolfo López Mateos|Toluca|MX
TLL|Lennart Meri Tallinn|Tallinn|EE
TLM|Zenata – Messali El Hadj|Zenata|DZ
TLS|Toulouse-Blagnac|Toulouse/Blagnac|FR
TLV|Ben Gurion|Tel Aviv|IL
TML|Yakubu Tali|Tamale|GH
TMM|Toamasina Ambalamanasy|Toamasina|MG
TMP|Tampere-Pirkkala|Tampere / Pirkkala|FI
TMR|Aguenar – Hadj Bey Akhamok|Tamanrasset|DZ
TMS|São Tomé|São Tomé|ST
TNA|Jinan Yaoqiang|Jinan|CN
TNG|Tangier Ibn Battuta|Tangier|MA
TNN|Tainan International Airport / Tainan Air Base|Tainan|TW
TNR|Ivato|Antananarivo|MG
TOF|Tomsk Kamov|Tomsk|RU
TOM|Tombouktou|Timbuktu|ML
TOS|Tromsø|Tromsø|NO
TPA|Tampa|Tampa|US
TPE|Taiwan Taoyuan|Taoyuan|TW
TQO|Felipe Carrillo Puerto International Airport Tulum|Tulum|MX
TRD|Trondheim Airport, Værnes|Trondheim|NO
TRF|Sandefjord Airport, Torp|Sandefjord|NO
TRN|Turin|Caselle Torinese|IT
TRS|Trieste|Ronchi dei Legionari/Trieste|IT
TRU|Capitán FAP Carlos Martínez de Pinillos|Trujillo|PE
TRV|Thiruvananthapuram|Thiruvananthapuram|IN
TRW|Bonriki|South Tarawa|KI
TRZ|Tiruchirappalli|Tiruchirappalli|IN
TSA|Taipei Songshan|Taipei|TW
TSF|Treviso|Treviso|IT
TSN|Tianjin Binhai|Tianjin|CN
TSR|Timișoara Traian Vuia|Timişoara|RO
TTU|Sania Ramel|Tétouan|MA
TUC|Teniente Benjamín Matienzo|San Miguel de Tucumán|AR
TUK|Turbat|Turbat|PK
TUL|Tulsa|Tulsa|US
TUN|Tunis Carthage|Tunis|TN
TUS|Tucson|Tucson|US
TUU|Prince Sultan bin Abdulaziz|Tabuk|SA
TXN|Huangshan Tunxi|Huangshan|CN
TYN|Taiyuan Wusu|Taiyuan|CN
TYS|McGhee Tyson|Knoxville/Maryville|US
TZL|Tuzla|Dubrave Gornje|BA
UBN|Ulaanbaatar Chinggis Khaan|Ulaanbaatar|MN
UDJ|Uzhhorod|Uzhhorod|UA
UET|Quetta|Quetta|PK
UFA|Ufa|Ufa|RU
UGC|Urgench|Urgench|UZ
UIO|Mariscal Sucre|Quito|EC
UKB|Kobe|Kobe|JP
UKK|Oskemen|Ust-Kamenogorsk|KZ
ULH|Al-Ula|Al-Ula|SA
UME|Umeå|Umeå|SE
UPG|Sultan Hasanuddin|Makassar|ID
URA|Manshuk Mametova|Uralsk|KZ
URC|Ürümqi Tianshan|Ürümqi|CN
USM|Samui|Na Thon|TH
UTH|Udon Thani|Udon Thani|TH
UTP|U-Tapao–Rayong–Pattaya|Rayong|TH
UUD|Baikal|Ulan Ude|RU
UUS|Yuzhno-Sakhalinsk|Yuzhno-Sakhalinsk|RU
UVF|Hewanorra|Vieux Fort|LC
UYU|Joya Andina|Quijarro|BO
VAA|Vaasa|Vaasa|FI
VAR|Varna|Varna|BG
VAV|Vava'u|Vava'u Island|TO
VBY|Visby|Visby|SE
VCA|Can Tho|Can Tho|VN
VCE|Venice Marco Polo|Venezia|IT
VCP|Viracopos|Campinas|BR
VER|General Heriberto Jara|Veracruz|MX
VFA|Victoria Falls|Victoria Falls|ZW
VGA|Vijayawada|Vijayawada|IN
VIE|Vienna|Vienna|AT
VIL|Dakhla|Dakhla|EH
VIX|Eurico de Aguiar Salles|Vitória|BR
VKO|Vnukovo|Moscow|RU
VLC|Valencia|Valencia|ES
VLI|Bauerfield|Port Vila|VU
VLN|Arturo Michelena|Valencia|VE
VNO|Vilnius|Vilnius|LT
VNS|Lal Bahadur Shastri|Varanasi|IN
VOG|Volgograd|Volgograd|RU
VRA|Juan Gualberto Gomez|Matanzas|CU
VRN|Verona Villafranca Valerio Catullo|Caselle|IT
VSA|Carlos Rovirosa Pérez|Villahermosa|MX
VST|Stockholm Västerås|Stockholm / Västerås|SE
VTE|Wattay|Vientiane|LA
VTZ|Visakhapatnam|Visakhapatnam|IN
VVI|Viru Viru|Santa Cruz|BO
VVO|Vladivostok|Artyom|RU
VXE|Cesaria Evora|São Pedro|CV
WAW|Warsaw Chopin|Warsaw|PL
WDH|Hosea Kutako|Windhoek|NA
WLG|Wellington|Wellington|NZ
WLS|Hihifo|Wallis Island|WF
WMI|Warsaw Modlin|Nowy Dwór Mazowiecki|PL
WNZ|Wenzhou Longwan|Wenzhou|CN
WRO|Copernicus Wrocław|Wrocław|PL
WTB|Toowoomba Wellcamp|Toowoomba|AU
WUH|Wuhan Tianhe|Wuhan|CN
WUX|Sunan Shuofang|Wuxi|CN
WVB|Walvis Bay|Walvis Bay|NA
XBJ|Birjand|Birjand|IR
XIY|Xi'an Xianyang|Xi'an|CN
XMN|Xiamen Gaoqi|Xiamen|CN
XNN|Xining Caojiabao|Haidong|CN
XPL|Palmerola|Palmerola|HN
YAP|Yap|Yap Island|FM
YCU|Yuncheng Yanhu|Yuncheng|CN
YEG|Edmonton|Edmonton|CA
YHZ|Halifax / Stanfield|Halifax|CA
YIA|Yogyakarta|Yogyakarta|ID
YIW|Yiwu|Yiwu/Jinhua|CN
YKS|Platon Oyunsky Yakutsk|Yakutsk|RU
YLW|Kelowna|Kelowna|CA
YNB|Prince Abdulmohsen Bin Abdulaziz|Yanbu|SA
YNT|Yantai Penglai|Yantai|CN
YNY|Yangyang|Gonghang-ro|KR
YNZ|Yancheng Nanyang|Yancheng|CN
YOW|Ottawa Macdonald-Cartier|Ottawa|CA
YQB|Quebec Jean Lesage|Quebec|CA
YUL|Montreal / Pierre Elliott Trudeau|Montréal|CA
YVR|Vancouver|Vancouver|CA
YWG|Winnipeg / James Armstrong Richardson|Winnipeg|CA
YXE|Saskatoon John G. Diefenbaker|Saskatoon|CA
YYC|Calgary|Calgary|CA
YYJ|Victoria|Victoria|CA
YYT|St. John's|St. John's|CA
YYZ|Toronto Pearson|Toronto|CA
ZAD|Zadar|Zadar|HR
ZAG|Zagreb Franjo Tuđman|Velika Gorica|HR
ZAH|Zahedan|Zahedan|IR
ZAM|Zamboanga|Zamboanga|PH
ZAZ|Zaragoza|Zaragoza|ES
ZCO|La Araucanía|Temuco|CL
ZHA|Zhanjiang Wuchuan|Zhanjiang|CN
ZIA|Zhukovsky|Moscow|RU
ZIH|Ixtapa-Zihuatanejo|Ixtapa|MX
ZNZ|Abeid Amani Karume|Zanzibar|TZ
ZQN|Queenstown|Queenstown|NZ
ZRH|Zürich|Zurich|CH
ZSA|San Salvador|San Salvador|BS
ZSE|Saint-Pierre Pierrefonds|Saint-Pierre|RE
ZUH|Zhuhai Jinwan|Zhuhai|CN
ZYL|Osmany|Sylhet|BD
AAA|Anaa|Anaa|PF
AAP|Aji Pangeran Tumenggung Pranoto|Samarinda|ID
AAQ|Anapa Vityazevo|Krasnyi Kurgan|RU
AAT|Altay Xuedu|Altay|CN
AAX|Romeu Zema|Araxá|BR
AAY|Al Ghaydah|Al Ghaydah|YE
ABE|Lehigh Valley|Allentown/Bethlehem|US
ABI|Abilene Regional|Abilene|US
ABK|Kebri Dahar|Kebri Dahar|ET
ABL|Ambler|Ambler|US
ABR|Aberdeen Regional|Aberdeen|US
ABS|Abu Simbel|Abu Simbel|EG
ABT|King Saud Bin Abdulaziz (Al Baha)|Al-Baha|SA
ABX|Albury|East Albury|AU
ABY|Southwest Georgia Regional|Albany|US
ACH|Sankt Gallen Altenrhein|St. Gallen|CH
ACI|Alderney|Saint Anne|GG
ACK|Nantucket Memorial|Nantucket|US
ACT|Waco Regional|Waco|US
ACV|California Redwood Coast-Humboldt County|Arcata/Eureka|US
ACX|Xingyi Wanfenglin|Xingyi|CN
ACY|Atlantic City|Atlantic City|US
ADF|Adıyaman|Adıyaman|TR
ADK|Adak|Adak|US
ADQ|Kodiak|Kodiak|US
ADU|Ardabil|Ardabil|IR
AEB|Baise (Bose) Bama|Baise|CN
AEH|Abeche|Abeche|TD
AEU|Abu Musa Island|Abu Musa|IR
AEX|Alexandria|Alexandria|US
AFA|Suboficial Ay Santiago Germano|San Rafael|AR
AFL|Piloto Osvaldo Marques Dias|Alta Floresta|BR
AFZ|Sabzevar National|Sabzevar|IR
AGH|Ängelholm-Helsingborg|Ängelholm|SE
AGR|Agra Airport / Agra Air Force Station|Agra|IN
AGS|Augusta Regional At Bush Field|Augusta|US
AGX|Agatti|Agatti|IN
AHA|Maa Mahamaya|Ambikapur|IN
AHE|Ahe|Ahe Atoll|PF
AHO|Alghero-Fertilia|Alghero|IT
AIA|Alliance Municipal|Alliance|US
AIN|Wainwright|Wainwright|US
AJA|Ajaccio Napoléon Bonaparte airport|Ajaccio|FR
AJI|Ağrı|Ağrı|TR
AJL|Lengpui|Aizawl|IN
AJN|Ouani|Ouani|KM
AJR|Arvidsjaur|Arvidsjaur|SE
AJU|Aracaju - Santa Maria|Aracaju|BR
AKF|Kufra|Kufra|LY
AKJ|Asahikawa|Higashikagura|JP
AKN|King Salmon|King Salmon|US
AKP|Anaktuvuk Pass|Anaktuvuk Pass|US
AKR|Akure|Akure|NG
AKU|Aksu Hongqipo|Aksu|CN
AKY|Sittwe|Sittwe|MM
ALF|Alta|Alta|NO
ALH|Albany|Albany|AU
ALO|Waterloo Regional|Waterloo|US
ALS|San Luis Valley Regional Airport/Bergman Field|Alamosa|US
ALW|Walla Walla Regional|Walla Walla|US
AMA|Rick Husband Amarillo|Amarillo|US
AMH|Arba Minch|Arba Minch|ET
AMV|Amderma|Amderma|RU
ANI|Aniak|Aniak|US
ANR|Antwerp International Airport (Deurne)|Antwerp|BE
ANV|Anvik|Anvik|US
ANX|Andøya Airport, Andenes|Andenes|NO
AOG|Anshan Teng'ao Airport / Anshan Air Base|Anshan|CN
AOI|Marche|Falconara Marittima|IT
AOK|Karpathos|Karpathos Island|GR
AOO|Altoona Blair County|Altoona|US
AOR|Sultan Abdul Halim|Alor Satar|MY
APN|Alpena County Regional|Alpena|US
APO|Antonio Roldán Betancur|Carepa|CO
AQA|Araraquara|Araraquara|BR
AQG|Anqing Tianzhushan Airport / Anqing North Air Base|Anqing|CN
ARC|Arctic Village|Arctic Village|US
ARH|Talagi|Archangelsk|RU
ARI|Chacalluta|Arica|CL
ARK|Arusha|Arusha|TZ
ARM|Armidale|Armidale|AU
ART|Watertown|Watertown|US
ARU|Araçatuba|Araçatuba|BR
ARW|Arad|Arad|RO
ASD|Andros Town|Andros Town|BS
ASE|Aspen-Pitkin County Airport (Sardy Field)|Aspen|US
ASI|RAF Ascension Island|Cat Hill|SH
ASJ|Amami|Amami|JP
ASM|Asmara|Asmara|ER
ASO|Asosa|Asosa|ET
ASP|Alice Springs|Alice Springs|AU
ASV|Amboseli|Ol Tukai|KE
ATC|Arthur's Town|Arthur's Town|BS
ATK|Atqasuk Edward Burnell Sr Memorial|Atqasuk|US
ATM|Altamira Interstate|Altamira|BR
ATW|Appleton|Appleton|US
ATY|Watertown Regional|Watertown|US
AUC|Santiago Perez|Arauca|CO
AUG|Augusta State|Augusta|US
AUQ|Hiva Oa-Atuona|Hiva Oa Island|PF
AUR|Aurillac airport|Aurillac|FR
AUX|Araguaína|Araguaína|BR
AVA|Anshun Huangguoshu|Anshun|CN
AVK|Arvaikheer|Arvaikheer|MN
AVL|Asheville Regional|Asheville|US
AVN|Avignon Caumont airport|Avignon|FR
AVP|Wilkes-Barre/Scranton|Wilkes-Barre/Scranton|US
AWK|Wake Island|Wake Island|UM
AXA|Clayton J. Lloyd|The Valley|AI
AXD|Alexandroupoli Democritus|Alexandroupolis|GR
AXF|Alxa Left Banner Bayanhot|Bayanhot|CN
AXJ|Amakusa|Amakusa|JP
AXM|El Eden|Armenia|CO
AXP|Spring Point|Spring Point|BS
AXR|Arutua||PF
AXT|Akita|Akita|JP
AXU|Axum|Axum|ET
AYJ|Maharshi Valmiki|Faizabad|IN
AYP|Air Force Colonel Alfredo Mendivil Duarte|Ayacucho|PE
AYQ|Ayers Rock Connellan|Yulara|AU
AZA|Mesa Gateway|Mesa|US
AZD|Shahid Sadooghi|Yazd|IR
AZN|Andijan|Andijan|UZ
AZO|Kalamazoo/Battle Creek|Kalamazoo|US
AZR|Touat-Cheikh Sidi Mohamed Belkebir|Adrar|DZ
AZS|Samaná El Catey|Samana|DO
BAL|Batman|Batman|TR
BAR|Qionghai Bo'ao|Qionghai|CN
BAY|Maramureș|Tăuții-Măgherăuș|RO
BBA|Balmaceda|Balmaceda|CL
BBM|Battambang|Battambang|KH
BBN|Bario|Bario|MY
BBO|Berbera|Berbera|SO
BBQ|Burton-Nibbs|Codrington|AG
BCA|Gustavo Rizo|Baracoa|CU
BCH|Baucau|Baucau|TL
BCI|Barcaldine|Barcaldine|AU
BCO|Jinka|Jinka|ET
BDB|Bundaberg|Bundaberg|AU
BDH|Bandar Lengeh|Bandar Lengeh|IR
BDO|Husein Sastranegara|Bandung|ID
BDT|Gbadolite|Gbadolite|CD
BDU|Bardufoss|Målselv|NO
BEB|Benbecula|Balivanich|GB
BED|Laurence G Hanscom Field|Bedford|US
BEF|Bluefields|Bluefields|NI
BEJ|Kalimarau|Tanjung Redeb - Borneo Island|ID
BEK|Bareilly Air Force Station|Bareilly|IN
BET|Bethel|Bethel|US
BEU|Bedourie|Bedourie|AU
BFD|Bradford Regional|Bradford|US
BFF|Western Neb. Rgnl/William B. Heilig|Scottsbluff|US
BFI|King County International Airport - Boeing Field|Seattle|US
BFJ|Bijie Feixiong|Bijie|CN
BFL|Meadows Field|Bakersfield|US
BFV|Buri Ram|Buriram|TH
BFY|Bengbu Tenghu|Bengbu|CN
BGA|Palonegro|Bucaramanga|CO
BGC|Bragança|Bragança|PT
BGM|Greater Binghamton/Edwin A Link field|Binghamton|US
BGR|Bangor|Bangor|US
BHB|Hancock County-Bar Harbor|Bar Harbor|US
BHD|George Best Belfast City|Belfast|GB
BHE|Woodbourne|Blenheim|NZ
BHH|Bisha|Bisha|SA
BHI|Comandante Espora|Bahía Blanca|AR
BHJ|Bhuj|Bhuj|IN
BHQ|Broken Hill|Broken Hill|AU
BHS|Bathurst|Bathurst|AU
BHU|Bhavnagar|Bhavnagar|IN
BHV|Bahawalpur|Bahawalpur|PK
BHY|Beihai Fucheng|Beihai|CN
BIH|Eastern Sierra Regional|Bishop|US
BIK|Frans Kaisiepo|Biak|ID
BIL|Billings Logan|Billings|US
BIM|South Bimini|South Bimini|BS
BIQ|Biarritz Pays Basque airport|Biarritz|FR
BIR|Biratnagar|Biratnagar|NP
BIS|Bismarck Municipal|Bismarck|US
BJB|Bojnord|Bojnord|IR
BJC|Rocky Mountain Metropolitan|Denver|US
BJF|Båtsfjord|Båtsfjord|NO
BJR|Bahir Dar|Bahir Dar|ET
BJZ|Badajoz|Badajoz|ES
BKG|Branson|Branson|US
BKN|Balkanabat|Balkanabat|TM
BKQ|Blackall|Blackall|AU
BKS|Fatmawati Soekarno|Bengkulu|ID
BKW|Raleigh County Memorial|Beaver|US
BLD|Boulder City Municipal|Boulder City|US
BLE|Dala|Borlange|SE
BLI|Bellingham|Bellingham|US
BLV|Scott AFB/Midamerica|Belleville|US
BMA|Stockholm-Bromma|Stockholm|SE
BMI|Central Illinois Regional Airport at Bloomington-Normal|Bloomington/Normal|US
BMU|Sultan Muhammad Salahuddin|Bima|ID
BMV|Buon Ma Thuot|Buon Ma Thuot|VN
BMW|Bordj Badji Mokhtar|Bordj Badji Mokhtar|DZ
BNI|Benin|Benin|NG
BNK|Ballina Byron Gateway|Ballina|AU
BNN|Brønnøysund Airport, Brønnøy|Brønnøy|NO
BNS|Barinas|Barinas|VE
BOB|Bora Bora|Motu Mute|PF
BOC|Bocas del Toro "Isla Colón"|Isla Colón|PA
BOH|Bournemouth|Bournemouth|GB
BOR|Bokeo|Ton Phueng|LA
BPE|Qinhuangdao Beidaihe|Qinhuangdao|CN
BPL|Bole Alashankou|Bole|CN
BPT|Jack Brooks Regional|Beaumont/Port Arthur|US
BPX|Qamdo Bangda|Bangda|CN
BPY|Besalampy|Besalampy|MG
BQK|Brunswick Golden Isles|Brunswick|US
BQL|Boulia||AU
BQN|Rafael Hernández|Aguadilla|PR
BQS|Ignatyevo|Blagoveschensk|RU
BQU|J F Mitchell|Bequia|VC
BRD|Brainerd Lakes Regional|Brainerd|US
BRK|Bourke||AU
BRL|Southeast Iowa Regional|Burlington|US
BRN|Bern|Bern|CH
BRO|Brownsville South Padre Island|Brownsville|US
BRQ|Brno-Tuřany|Brno|CZ
BRR|Barra|Eoligarry|GB
BRW|Wiley Post Will Rogers Memorial|Utqiaġvik|US
BRX|Maria Montez|Barahona|DO
BSC|José Celestino Mutis|Bahía Solano|CO
BSD|Baoshan Yunrui|Baoshan|CN
BSO|Basco|Basco|PH
BTC|Batticaloa|Batticaloa|LK
BTI|Barter Island Long Range Radar Station|Barter Island|US
BTK|Bratsk|Bratsk|RU
BTM|Bert Mooney|Butte|US
BTR|Baton Rouge Metropolitan|Baton Rouge|US
BTU|Bintulu|Bintulu|MY
BTV|Patrick Leahy Burlington|Burlington|US
BUA|Buka|Buka Island|PG
BUN|Gerardo Tobar López|Buenaventura|CO
BUX|Bunia|Bunia|CD
BUZ|Bushehr|Bushehr|IR
BVE|Brive Souillac airport|Brive|FR
BVG|Berlevåg|Berlevåg|NO
BVH|Brigadeiro Camarão|Vilhena|BR
BVI|Birdsville||AU
BVJ|Bovanenkovo|Bovanenkovo|RU
BWK|Brač|Gornji Humac|HR
BWO|Balakovo|Balakovo|RU
BWT|Wynyard|Burnie|AU
BXH|Balkhash|Balkhash|KZ
BXR|Bam|Bam|IR
BXU|Bancasi|Butuan|PH
BYK|Bouaké|Bouaké|CI
BYM|Carlos Manuel de Cespedes|Bayamo|CU
BYN|Bayankhongor|Bayankhongor|MN
BZG|Ignacy Jan Paderewski Bydgoszcz|Bydgoszcz|PL
BZI|Balıkesir|Balıkesir|TR
BZK|Bryansk|Bryansk|RU
BZL|Barisal|Barisal|BD
BZN|Bozeman Yellowstone|Bozeman|US
BZO|Bolzano|Bolzano|IT
BZR|Béziers Vias airport|Béziers|FR
BZX|Bazhong Enyang|Bazhong|CN
CAB|Cabinda|Cabinda|AO
CAC|Coronel Adalberto Mendes da Silva|Cascavel|BR
CAE|Columbia Metropolitan|Columbia|US
CAH|Cà Mau|Ca Mau City|VN
CAJ|Canaima|Canaima|VE
CAK|Akron Canton Regional|Akron|US
CAL|Campbeltown|Campbeltown|GB
CAT|Cascais|Cascais|PT
CAW|Bartolomeu Lisandro|Campos dos Goytacazes|BR
CAZ|Cobar||AU
CBH|Béchar Boudghene Ben Ali Lotfi|Béchar|DZ
CBO|Cotabato (Awang)|Datu Odin Sinsuat|PH
CBQ|Margaret Ekpo|Calabar|NG
CBR|Canberra|Canberra|AU
CBT|Catumbela|Catumbela|AO
CCC|Jardines Del Rey|Cayo Coco|CU
CCE|Capital|New Cairo|EG
CCF|Carcassonne Salvaza|Carcassonne|FR
CCR|Buchanan Field|Concord|US
CCZ|Chub Cay|Chub Cay|BS
CDB|Cold Bay|Cold Bay|US
CDC|Cedar City Regional|Cedar City|US
CDE|Chengde Puning|Chengde|CN
CDP|Kadapa|Kadapa|IN
CDR|Chadron Municipal|Chadron|US
CDT|Castellón-Costa Azahar|Castellón de la Plana|ES
CDV|Merle K (Mudhole) Smith|Cordova|US
CEC|Jack Mc Namara Field|Crescent City|US
CED|Ceduna||AU
CEE|Cherepovets|Cherepovets|RU
CEN|Ciudad Obregón|Ciudad Obregón|MX
CEZ|Cortez Municipal|Cortez|US
CFG|Jaime Gonzalez|Cienfuegos|CU
CFN|Donegal|Donegal|IE
CFR|Caen Carpiquet airport|Caen|FR
CFS|Coffs Harbour|Coffs Harbour|AU
CGD|Changde Taohuayuan|Changde|CN
CGI|Cape Girardeau Regional|Cape Girardeau|US
CGM|Camiguin|Mambajao|PH
CGR|Campo Grande|Campo Grande|BR
CHA|Chattanooga Metropolitan Airport (Lovell Field)|Chattanooga|US
CHG|Chaoyang|Shuangta, Chaoyang|CN
CHH|Chachapoyas|Chachapoyas|PE
CHM|FAP Lieutenant Jaime Andres de Montreuil Morales|Chimbote|PE
CHO|Charlottesville Albemarle|Charlottesville|US
CHT|Inia William Tuuta Memorial|Te One|NZ
CHX|Changuinola Captain Manuel Niño|Changuinola|PA
CID|The Eastern Iowa|Cedar Rapids|US
CIF|Chifeng Yulong|Chifeng|CN
CIJ|Capitán Aníbal Arab|Cobija|BO
CIU|Chippewa County|Kincheloe|US
CIW|Canouan|Canouan|VC
CIY|Comiso|Comiso|IT
CJA|Mayor General FAP Armando Revoredo Iglesias|Cajamarca|PE
CJC|El Loa|Calama|CL
CJL|Chitral|Chitral|PK
CJM|Chumphon|Chumphon|TH
CKB|North Central West Virginia|Bridgeport|US
CKH|Chokurdakh|Chokurdah|RU
CKS|Carajás|Parauapebas|BR
CKZ|Çanakkale|Çanakkale|TR
CLD|McClellan-Palomar|Carlsbad|US
CLL|Easterwood Field|College Station|US
CLQ|Licenciado Miguel de la Madrid|Colima|MX
CLY|Calvi Sainte Catherine|Calvi|FR
CMA|Cunnamulla||AU
CME|Ciudad del Carmen|Ciudad del Carmen|MX
CMF|Chambéry Aix les Bains airport|Chambéry|FR
CMG|Corumbá|Corumbá|BR
CMI|University of Illinois Willard|Savoy|US
CMU|Chimbu|Kundiawa|PG
CMX|Houghton County Memorial|Hancock|US
CNB|Coonamble||AU
CNJ|Cloncurry|Cloncurry|AU
CNM|Cavern City Air Terminal|Carlsbad|US
CNP|Neerlerit Inaat|Neerlerit Inaat|GL
CNQ|Corrientes|Corrientes|AR
CNY|Canyonlands Regional|Moab|US
COD|Yellowstone Regional|Cody|US
COQ|Choibalsan||MN
COU|Columbia Regional|Columbia|US
CPC|Aviador C. Campos|Chapelco/San Martin de los Andes|AR
CPD|Coober Pedy|Coober Pedy|AU
CPE|Ingeniero Alberto Acuña Ongay|Campeche|MX
CPO|Desierto de Atacama|Copiapo|CL
CPR|Casper-Natrona County|Casper|US
CPV|Presidente João Suassuna|Campina Grande|BR
CPX|Benjamin Rivera Noriega|Culebra|PR
CQW|Chongqing Xiannüshan|Wulong|CN
CRI|Colonel Hill|Colonel Hill|BS
CRM|Catarman National|Catarman|PH
CRP|Corpus Christi|Corpus Christi|US
CRV|Crotone Sant'Anna Pythagoras|Isola di Capo Rizzuto|IT
CRW|Yeager|Charleston|US
CSG|Columbus|Columbus|US
CSK|Cap Skirring|Cap Skirring|SN
CSW|Cabo San Lucas|Cabo San Lucas|MX
CSY|Cheboksary|Cheboksary|RU
CTC|Coronel Felipe Varela|Catamarca|AR
CTD|Alonso Valderrama|Chitré|PA
CTL|Charleville|Charleville|AU
CTM|Chetumal|Chetumal|MX
CTN|Cooktown||AU
CUC|Camilo Daza|Cúcuta|CO
CUE|Mariscal Lamar|Cuenca|EC
CUF|Cuneo|Levaldigi|IT
CUK|Caye Caulker|Caye Caulker|BZ
CUM|Antonio José de Sucre|Cumaná|VE
CUP|General Francisco Bermúdez|Carúpano|VE
CUQ|Coen|Coen|AU
CVM|General Pedro Jose Mendez|Ciudad Victoria|MX
CVN|Clovis Municipal|Clovis|US
CVQ|Carnarvon|Carnarvon|AU
CWA|Central Wisconsin|Mosinee|US
CWC|Chernivtsi|Chernivtsi|UA
CWJ|Cangyuan Washan|Lincang|CN
CXB|Cox's Bazar|Cox's Bazar|BD
CXJ|Hugo Cantergiani Regional|Caxias Do Sul|BR
CXP|Tunggul Wulung|Cilacap|ID
CYA|Antoine-Simon|Les Cayes|HT
CYB|Charles Kirkconnell|West End|KY
CYC|Caye Chapel|Caye Chapel|BZ
CYI|Chiayi|Shuishang|TW
CYO|Vilo Acuña|Cayo Largo del Sur|CU
CYP|Calbayog|Calbayog City|PH
CYS|Cheyenne Regional Jerry Olson Field|Cheyenne|US
CYX|Cherskiy|Cherskiy|RU
CYZ|Cauayan|Cauayan City|PH
CZE|José Leonardo Chirinos|Coro|VE
CZH|Corozal|Corozal|BZ
CZS|Cruzeiro do Sul|Cruzeiro Do Sul|BR
CZU|Las Brujas|Corozal|CO
CZX|Changzhou Benniu|Changzhou|CN
DAB|Daytona Beach|Daytona Beach|US
DAU|Daru|Daru|PG
DAV|Enrique Malek|David|PA
DAY|James M. Cox Dayton|Dayton|US
DBC|Baicheng Chang'an|Baicheng|CN
DBO|Dubbo City Regional|Dubbo|AU
DBQ|Dubuque Regional|Dubuque|US
DBR|Darbhanga|Darbhanga|IN
DCF|Canefield|Canefield|DM
DCM|Castres Mazamet|Castres|FR
DCY|Daocheng Yading|Garzê|CN
DDC|Dodge City Regional|Dodge City|US
DDG|Dandong Langtou|Dandong|CN
DDR|Shigatse Tingri|Xigazê|CN
DEA|Dera Ghazi Khan|Dera Ghazi Khan|PK
DEC|Decatur|Decatur|US
DED|Dehradun Jolly Grant|Dehradun|IN
DEF|Dezful|Dezful|IR
DGA|Dangriga|Dangriga|BZ
DGO|General Guadalupe Victoria|Durango|MX
DGT|Sibulan|Dumaguete City|PH
DHM|Kangra|Kangra|IN
DHN|Dothan Regional|Dothan|US
DHX|Dhoho|Kediri|ID
DIB|Dibrugarh|Dibrugarh|IN
DIE|Arrachart|Antisiranana|MG
DIG|Diqing Shangri-La|Diqing|CN
DIJ|Dijon Longvic airport|Dijon|FR
DIK|Dickinson Theodore Roosevelt Regional|Dickinson|US
DIN|Dien Bien Phu|Dien Bien Phu|VN
DIY|Diyarbakır|Diyarbakır|TR
DKA|Umaru Musa Yar'adua|Katsina|NG
DLE|Dole Tavaux|Dole|FR
DLG|Dillingham|Dillingham|US
DLH|Duluth|Duluth|US
DLI|Lien Khuong|Da Lat|VN
DLU|Dali Fengyi|Dali|CN
DLZ|Dalanzadgad|Dalanzadgad|MN
DMU|Dimapur|Dimapur|IN
DND|Dundee|Dundee|GB
DNK|Dnipro|Dnipro|UA
DNR|Dinard Pleurtuit Saint-Malo airport|Dinard|FR
DNZ|Çardak|Denizli|TR
DOD|Dodoma|Dodoma|TZ
DOG|Dongola|Dongola|SD
DOL|Deauville Normandie airport|Deauville|FR
DOM|Douglas-Charles|Marigot|DM
DOV|Dover Civil Air Terminal/Dover Air Force Base|Dover|US
DOY|Dongying Shengli|Dongying|CN
DPL|Dipolog|Dipolog|PH
DPO|Devonport|Devonport|AU
DRG|Deering|Deering|US
DRO|Durango La Plata County|Durango|US
DSI|Destin Executive|Destin|US
DSO|Sondok|Sŏndŏng-ni|KP
DTU|Wudalianchi Dedu|Heihe|CN
DUD|Dunedin|Dunedin|NZ
DUE|Dundo|Chitato|AO
DUJ|DuBois Regional|Dubois|US
DUM|Pinang Kampai|Dumai|ID
DUT|Tom Madsen (Dutch Harbor)|Unalaska|US
DVL|Devils Lake Regional|Devils Lake|US
DWD|Dawadmi Domestic|Dawadmi|SA
DYR|Ugolny Yuri Ryktheu|Anadyr|RU
DZH|Dazhou Jinya|Dazhou|CN
EAM|Najran Domestic|Najran|SA
EAR|Kearney Regional|Kearney|US
EAS|San Sebastián|Hondarribia|ES
EAT|Pangborn Memorial|Wenatchee|US
EAU|Chippewa Valley Regional|Eau Claire|US
EBA|Marina di Campo|Campo nell'Elba|IT
EBD|El-Obeid|El-Obeid|SD
EBJ|Esbjerg|Esbjerg|DK
ECP|Northwest Florida Beaches|Panama City Beach|US
EFL|Kefallinia|Kefallinia Island|GR
EGC|Bergerac Dordogne-Périgord airport|Bergerac|FR
EGE|Eagle County Regional|Eagle|US
EGO|Belgorod|Belgorod|RU
EGS|Egilsstaðir|Egilsstaðir|IS
EGX|Egegik|Egegik|US
EIE|Yeniseysk|Yeniseysk|RU
EJA|Yariguíes|Barrancabermeja|CO
EJH|Al Wajh Domestic|Al Wajh|SA
EKO|Elko Regional|Elko|US
ELC|Elcho Island|Elcho Island|AU
ELD|South Arkansas Regional Airport at Goodwin Field|El Dorado|US
ELF|El Fasher|El Fasher|SD
ELG|El Golea|El Menia|DZ
ELH|North Eleuthera|North Eleuthera|BS
ELM|Elmira Corning Regional|Elmira/Corning|US
ELU|Guemar Airport - مطار قمار بالوادي|Guemar|DZ
EMD|Emerald|Emerald|AU
EMK|Emmonak|Emmonak|US
ENA|Kenai Municipal|Kenai|US
ENF|Enontekio|Enontekio|FI
ENH|Enshi Xujiaping|Enshi|CN
ENY|Yan'an Nanniwan|Yan'an|CN
EOH|Enrique Olaya Herrera|Medellín|CO
EOI|Eday|Eday|GB
EPR|Esperance|Esperance|AU
EPU|Pärnu|Pärnu|EE
EQS|Esquel Brigadier Antonio Parodi|Esquel|AR
ERC|Erzincan|Erzincan|TR
ERH|Moulay Ali Cherif|Errachidia|MA
ERI|Erie International Tom Ridge Field|Erie|US
ERL|Erenhot Saiwusu|Erenhot|CN
ERS|Eros|Windhoek|NA
ERZ|Erzurum|Erzurum|TR
ESC|Delta County|Escanaba|US
ESD|Orcas Island|Eastsound|US
ESL|Elista|Elista|RU
ESR|Ricardo García Posada|El Salvador|CL
ESU|Essaouira-Mogador|Essaouira|MA
ETR|Santa Rosa - Artillery Colonel Victor Larrea|Santa Rosa|EC
ETZ|Metz-Nancy-Lorraine|Goin|FR
EUG|Eugene|Eugene|US
EUX|F. D. Roosevelt|Oranjestad|BQ
EVV|Evansville Regional|Evansville|US
EWB|New Bedford Regional|New Bedford|US
EWN|Coastal Carolina Regional|New Bern|US
EXT|Exeter|Exeter, Devon|GB
EYK|Beloyarskiy||RU
EYP|El Alcaravan - Yopal|Yopal|CO
EYW|Key West|Key West|US
EZS|Elazığ|Elazığ|TR
FAI|Fairbanks|Fairbanks|US
FAR|Hector|Fargo|US
FAV|Fakarava||PF
FAY|Fayetteville Regional Airport - Grannis Field|Fayetteville|US
FCA|Glacier Park|Kalispell|US
FCN|Sea-Airport Cuxhaven/Nordholz / Nordholz Naval Airbase|Wurster Nordseeküste|DE
FDU|Bandundu|Bandundu|CD
FEG|Fergana|Fergana|UZ
FEN|Fernando de Noronha|Fernando de Noronha|BR
FGU|Fangatau|Fangatau|PF
FIZ|Fitzroy Crossing||AU
FKQ|Fakfak|Fakfak|ID
FKS|Fukushima|Sukagawa|JP
FLA|Gustavo Artunduaga Paredes|Florencia|CO
FLG|Flagstaff Pulliam|Flagstaff|US
FLO|Florence Regional|Florence|US
FLW|Flores|Santa Cruz das Flores|PT
FLZ|Dr. Ferdinand Lumban Tobing|Sibolga|ID
FMA|Formosa National|Formosa|AR
FMI|Kalemie|Kalemie|CD
FNI|Nîmes-Arles-Camargue|Nîmes/Garons|FR
FNT|Bishop|Flint|US
FOD|Fort Dodge Regional|Fort Dodge|US
FOG|Foggia Gino Lisa|Foggia|IT
FON|La Fortuna Arenal|La Fortuna|CR
FRD|Friday Harbor|Friday Harbor|US
FRL|Forlì-Luigi Ridolfi|Forlì|IT
FRO|Florø|Florø|NO
FRS|Mundo Maya|San Benito|GT
FSD|Sioux Falls Regional|Sioux Falls|US
FSM|Fort Smith Regional|Fort Smith|US
FSP|Saint-Pierre Pointe-Blanche|Saint-Pierre|PM
FTE|El Calafate - Commander Armando Tola|El Calafate|AR
FTU|Tôlanaro|Tôlanaro|MG
FTW|Fort Worth Meacham|Fort Worth|US
FUG|Fuyang Xiguan|Yingzhou, Fuyang|CN
FUJ|Fukue|Goto|JP
FUN|Funafuti|Funafuti|TV
FUO|Foshan Shadi|Foshan|CN
FWA|Fort Wayne|Fort Wayne|US
FYJ|Fuyuan Dongji|Fuyuan|CN
FYN|Fuyun Koktokay|Fuyun|CN
FYU|Fort Yukon|Fort Yukon|US
GAE|Gabès Matmata|Gabès|TN
GAF|Gafsa Ksar|Gafsa|TN
GAJ|Yamagata|Higashine|JP
GAL|Edward G. Pitka Sr|Galena|US
GAM|Gambell|Gambell|US
GAQ|Gao|Gao|ML
GAY|Gaya|Gaya|IN
GBB|Gabala|Gabala|AZ
GBJ|Marie-Galante|Grand-Bourg|GP
GCC|Northeast Wyoming Regional|Gillette|US
GCH|Gachsaran|Gachsaran|IR
GCI|Guernsey|Saint Peter Port|GG
GCK|Garden City Regional|Garden City|US
GCN|Grand Canyon National Park|Grand Canyon - Tusayan|US
GDB|Gondia|Gondia|IN
GDE|Gode|Gode|ET
GDQ|Gondar|Azezo|ET
GDT|JAGS McCartney|Cockburn Town|TC
GDV|Dawson Community|Glendive|US
GDX|Sokol|Magadan|RU
GDZ|Gelendzhik|Gelendzhik|RU
GEA|Nouméa Magenta|Nouméa|NC
GEC|Lefkoniko Airport / Geçitkale Air Base|Lefkoniko|CY
GEL|Santo Ângelo|Santo Ângelo|BR
GEM|President Obiang Nguema|Mengomeyén|GQ
GER|Rafael Cabrera|Nueva Gerona|CU
GET|Geraldton|Moonyoonooka|AU
GEV|Gällivare|Gällivare|SE
GFF|Griffith|Griffith|AU
GFK|Grand Forks|Grand Forks|US
GGG|East Texas Regional|Longview|US
GGT|Exuma|Moss Town|BS
GGW|Glasgow Valley County Airport Wokal Field|Glasgow|US
GHA|Noumérat - Moufdi Zakaria|El Atteuf|DZ
GHB|Governor's Harbour|Governor's Harbour|BS
GHT|Ghat|Ghat|LY
GID|Gitega|Gitega|BI
GIL|Gilgit|Gilgit|PK
GIS|Gisborne|Gisborne|NZ
GIZ|Jizan Regional Airport / King Abdullah bin Abdulaziz|Jizan|SA
GJA|La Laguna|Guanaja|HN
GJT|Grand Junction Regional|Grand Junction|US
GKA|Goroka|Goronka|PG
GKN|Gulkana|Gulkana|US
GLF|Golfito|Golfito|CR
GLH|Mid Delta Regional|Greenville|US
GLT|Gladstone|Gladstone|AU
GMA|Gemena|Gemena|CD
GMB|Gambela|Gambela|ET
GME|Gomel|Gomel|BY
GMO|Gombe Lawanti|Gombe|NG
GMQ|Golog Maqên|Golog|CN
GMR|Totegegie||PF
GNB|Grenoble Alpes Isère|Grenoble|FR
GNS|Binaka|Gunungsitoli|ID
GNV|Gainesville Regional|Gainesville|US
GOP|Gorakhpur|Gorakhpur|IN
GOQ|Golmud|Golmud|CN
GOV|Gove|Nhulunbuy|AU
GPA|Patras Araxos Agamemnon|Patras|GR
GPI|Guapi|Guapi|CO
GPS|Seymour Galapagos Ecological|Isla Baltra|EC
GPT|Gulfport Biloxi|Gulfport|US
GRB|Austin Straubel|Green Bay|US
GRI|Central Nebraska Regional|Grand Island|US
GRK|Killeen Regional Airport / Robert Gray Army|Fort Cavazos|US
GRW|Graciosa|Santa Cruz da Graciosa|PT
GRX|F.G.L. Airport Granada-Jaén|Granada|ES
GRY|Grímsey|Grímsey/Sandvík|IS
GSP|Greenville-Spartanburg|Greenville/Greer/Spartanburg|US
GST|Gustavus|Gustavus|US
GTE|Groote Eylandt|Groote Eylandt|AU
GTF|Great Falls|Great Falls|US
GTR|Golden Triangle Regional|Columbus/W Point/Starkville|US
GUC|Gunnison Crested Butte Regional|Gunnison|US
GUP|Gallup Municipal|Gallup|US
GUR|Gurney|Gurney|PG
GVR|Coronel Altino Machado|Governador Valadares|BR
GWL|Gwalior|Gwalior|IN
GWT|Westerland Sylt|Sylt|DE
GXG|Negage|Negage|AO
GXH|Gannan Xiahe|Gannan|CN
GYA|Guayaramerín|Guayaramerín|BO
GYM|General José María Yáñez|Guaymas|MX
GYS|Guangyuan Panlong|Guangyuan|CN
GYU|Guyuan Liupanshan|Guyuan|CN
GYY|Gary/Chicago|Gary|US
GZP|Gazipaşa-Alanya|Gazipaşa|TR
HAC|Hachijojima|Hachijojima|JP
HAD|Halmstad|Halmstad|SE
HAU|Haugesund Airport, Karmøy|Karmøy|NO
HBX|Hubballi|Hubballi|IN
HCJ|Hechi Jinchengjiang|Hechi|CN
HCR|Holy Cross|Holy Cross|US
HCZ|Chenzhou Beihu|Chenzhou|CN
HDF|Heringsdorf|Zirchow|DE
HDG|Handan|Handan|CN
HDM|Hamadan|Hamadan|IR
HDN|Yampa Valley|Hayden|US
HDS|Eastgate Airport / Air Force Base Hoedspruit|Hoedspruit|ZA
HEH|Heho|Heho|MM
HEK|Heihe Aihui|Heihe|CN
HFA|Uri Michaeli Haifa|Haifa|IL
HFN|Hornafjörður|Höfn|IS
HFT|Hammerfest|Hammerfest|NO
HGI|Itanagar Donyi Polo Hollongi|Hollongi|IN
HGN|Mae Hong Son|Mae Hong Son|TH
HGO|Korhogo|Korhogo|CI
HGR|Hagerstown Regional Richard A Henson Field|Hagerstown|US
HGU|Mount Hagen Kagamuga|Mount Hagen|PG
HHH|Hilton Head|Hilton Head Island|US
HHQ|Hua Hin|Hua Hin|TH
HHR|Jack Northrop Field Hawthorne Municipal|Hawthorne|US
HIB|Range Regional|Hibbing|US
HID|Horn Island|Horn|AU
HII|Lake Havasu City|Lake Havasu City|US
HIN|Sacheon Airport / Sacheon Air Base|Sacheon|KR
HJJ|Huaihua Zhijiang|Huaihua|CN
HJR|Khajuraho|Khajuraho|IN
HKK|Hokitika||NZ
HKN|Hoskins|Kimbe|PG
HLE|Saint Helena|Jamestown|SH
HLN|Helena Regional|Helena|US
HLZ|Hamilton|Hamilton|NZ
HMA|Khanty Mansiysk|Khanty-Mansiysk|RU
HME|Hassi Messaoud-Oued Irara Krim Belkacem|Hassi Messaoud|DZ
HMI|Hami|Hami|CN
HNA|Iwate Hanamaki|Hanamaki|JP
HNM|Hana|Hana|US
HNS|Haines|Haines|US
HOB|Lea County Regional|Hobbs|US
HOI|Hao|Otepa|PF
HOM|Homer|Homer|US
HOR|Horta|Horta|PT
HOT|Memorial Field|Hot Springs|US
HOV|Ørsta-Volda Airport, Hovden|Ørsta|NO
HPA|Lifuka Island|Lifuka|TO
HPG|Shennongjia Hongping|Shennongjia|CN
HPN|Westchester County|White Plains|US
HQL|Tashikuergan Hongqilafu|Tashikuergan|CN
HRI|Mattala Rajapaksa|Mattala|LK
HRL|Valley|Harlingen|US
HRO|Boone County|Harrison|US
HSC|Shaoguan Danxia|Shaoguan|CN
HSL|Huslia|Huslia|US
HSV|Huntsville|Huntsville|US
HTG|Khatanga|Khatanga|RU
HTI|Hamilton Island|Hamilton Island|AU
HTN|Hotan|Hotan|CN
HTS|Tri-State Airport / Milton J. Ferguson Field|Huntington|US
HTT|Huatugou|Mengnai|CN
HTY|Hatay|Antakya|TR
HUH|Huahine-Fare|Fare|PF
HUI|Phu Bai|Huế|VN
HUO|Holingol Huolinhe|Holingol|CN
HUU|Alferez Fap David Figueroa Fernandini|Huánuco|PE
HUY|Humberside|Grimsby, Lincolnshire|GB
HUZ|Huizhou Pingtan|Huizhou|CN
HVB|Hervey Bay|Hervey Bay|AU
HVD|Khovd|Khovd|MN
HVG|Honningsvåg Airport, Valan|Honningsvåg|NO
HVN|Tweed New Haven|New Haven|US
HVR|Havre City County|Havre|US
HXD|Haixi Delingha|Delingha|CN
HYA|Cape Cod Gateway|Hyannis|US
HYN|Taizhou Luqiao|Taizhou|CN
HYS|Hays Regional|Hays|US
HZA|Heze Mudan|Heze|CN
HZG|Hanzhong Chenggu|Hanzhong|CN
HZH|Liping|Liping|CN
IAA|Igarka|Igarka|RU
IAG|Niagara Falls|Niagara Falls|US
IAM|Zarzaitine - In Aménas|In Aménas|DZ
IAN|Bob Baker Memorial|Kiana|US
IBA|Ibadan|Ibadan|NG
IBE|Perales|Ibagué|CO
ICT|Wichita Dwight D. Eisenhower National|Wichita|US
IDA|Idaho Falls Regional|Idaho Falls|US
IEG|Zielona Góra-Babimost|Nowe Kramsko|PL
IFJ|Ísafjörður|Ísafjörður|IS
IFO|Ivano-Frankivsk|Ivano-Frankivsk|UA
IGA|Inagua|Matthew Town|BS
IGD|Iğdır|Iğdır|TR
IGR|Cataratas Del Iguazú|Puerto Iguazu|AR
IGT|Magas|Sunzha|RU
IJK|Izhevsk|Izhevsk|RU
IKG|Karakol|Karakol|KG
IKI|Iki|Iki|JP
IKS|Tiksi|Tiksi|RU
ILD|Lleida-Alguaire|Lleida|ES
ILG|Wilmington|Wilmington|US
ILI|Iliamna|Iliamna|US
ILM|Wilmington|Wilmington|US
ILP|Île des Pins|Île des Pins|NC
ILQ|General Jorge Fernandez Maldon|Ilo|PE
ILS|Ilopango|San Salvador|SV
ILY|Islay|Isle of Islay, Argyll and Bute|GB
IMP|Prefeito Renato Moreira|Imperatriz|BR
IMT|Ford|Kingsford|US
INH|Inhambane|Inhambane|MZ
INL|Falls|International Falls|US
INU|Nauru|Yaren|NR
INV|Inverness|Inverness|GB
INZ|In Salah|In Salah|DZ
IOA|Ioannina King Pyrrhus National|Ioannina|GR
IOS|Bahia - Jorge Amado|Ilhéus|BR
IPI|San Luis|Ipiales|CO
IPL|Imperial County|Imperial|US
IPN|Usiminas|Ipatinga|BR
IPT|Williamsport Regional|Williamsport|US
IQM|Qiemo Yudu|Qiemo|CN
IQN|Qingyang Xifeng|Qingyang|CN
IRG|Lockhart River|Lockhart River|AU
IRJ|Capitan V A Almonacid|La Rioja|AR
IRK|Kirksville Regional|Kirksville|US
IRP|Matari|Isiro|CD
ISA|Mount Isa|Mount Isa|AU
ISE|Süleyman Demirel|Isparta|TR
ISG|New Ishigaki|Ishigaki|JP
ISP|Long Island MacArthur|Islip|US
ISU|Jalal Talabani|Sulaymaniyah|IQ
ITB|Itaituba|Itaituba|BR
ITH|Ithaca Tompkins Regional|Ithaca|US
ITO|Hilo|Hilo|US
IUE|Niue|Alofi|NU
IVC|Invercargill|Invercargill|NZ
IWA|Ivanovo South|Ivanovo|RU
IWJ|Iwami|Masuda|JP
IWK|Iwakuni Kintaikyo|Iwakuni|JP
IXA|Agartala - Maharaja Bir Bikram|Agartala|IN
IXD|Prayagraj|Allahabad|IN
IXG|Belagavi|Belgaum|IN
IXI|Lilabari North Lakhimpur|Lilabari|IN
IXJ|Jammu|Jammu|IN
IXK|Keshod|Keshod|IN
IXL|Leh Kushok Bakula Rimpochee|Leh|IN
IXM|Madurai|Madurai|IN
IXP|Pathankot|Pathankot|IN
IXR|Birsa Munda|Ranchi|IN
IXS|Silchar|Silchar|IN
IXU|Aurangabad|Aurangabad|IN
IXY|Kandla|Kandla|IN
IZA|Presidente Itamar Franco|Juiz de Fora|BR
IZO|Izumo Enmusubi|Izumo|JP
IZT|General Antonio Cárdenas Rodríguez National Airport / Ixtepec Air Base|Ixtepec|MX
JAC|Jackson Hole|Jackson|US
JAE|Shumba|Jaén|PE
JAN|Jackson-Medgar Wiley Evers|Jackson|US
JAU|Francisco Carle|Jauja|PE
JAV|Ilulissat|Ilulissat|GL
JBQ|La Isabela|La Isabela|DO
JBR|Jonesboro Municipal|Jonesboro|US
JDF|Francisco de Assis|Juiz de Fora|BR
JDH|Jodhpur|Jodhpur|IN
JDZ|Jingdezhen Luojia|Jingdezhen|CN
JEE|Jérémie|Carrefour Sanon|HT
JEG|Aasiaat|Aasiaat|GL
JER|Jersey|St. Peter|JE
JGA|Jamnagar|Jamnagar|IN
JGD|Daxing'anling Elunchun|Jiagedaqi|CN
JGS|Jinggangshan|Ji'an|CN
JHM|Kapalua|Lahaina|US
JHS|Sisimiut|Sisimiut|GL
JIC|Jinchang Jinchuan|Jinchang|CN
JIM|Jimma|Jimma|ET
JIQ|Qianjiang Wulingshan|Qianjiang|CN
JJD|Comandante Ariston Pessoa|Cruz|BR
JJU|Qaqortoq|Qaqortoq|GL
JKG|Jönköping|Jönköping|SE
JKH|Chios Island National|Chios Island|GR
JKR|Janakpur|Janakpur|NP
JLN|Joplin Regional|Joplin|US
JLR|Jabalpur|Jabalpur|IN
JMJ|Lancang Jingmai|Pu'er|CN
JMK|Mykonos Island National|Mykonos|GR
JMS|Jamestown Regional|Jamestown|US
JMU|Jiamusi Songjiang|Jiamusi|CN
JNG|Jining Da'an|Jining|CN
JNH|Jiaxing Nanhu|Xiuzhou, Hangzhou|CN
JNU|Juneau|Juneau|US
JNZ|Jinzhou Bay|Jinzhou|CN
JOE|Joensuu|Joensuu|FI
JOG|Adisutjipto|Yogyakarta|ID
JOI|Lauro Carneiro de Loyola|Joinville|BR
JOL|Jolo|Jolo|PH
JOS|Yakubu Gowon|Jos|NG
JRH|Jorhat|Jorhat|IN
JSA|Jaisalmer||IN
JSH|Sitia|Crete Island|GR
JSI|Skiathos Island National|Skiathos|GR
JSJ|Jiansanjiang Shidi|Jiansanjiang|CN
JSR|Jessore|Jashore|BD
JST|John Murtha Johnstown Cambria County|Johnstown|US
JTC|Bauru/Arealva–Moussa Nakhal Tobias State|Bauru|BR
JUZ|Quzhou|Quzhou|CN
JXA|Jixi Xingkaihu|Jixi|CN
JYV|Jyväskylä|Jyväskylän Maalaiskunta|FI
JZH|Jiuzhai Huanglong|Ngawa|CN
KAB|Kariba|Kariba|ZW
KAC|Qamishli|Qamishli|SY
KAI|Kaieteur|Kaieteur Falls|GY
KAJ|Kajaani|Kajaani|FI
KAO|Kuusamo|Kuusamo|FI
KAT|Kaitaia|Awanui|NZ
KAW|Kawthoung|Kawthoung|MM
KBR|Sultan Ismail Petra|Kota Baharu|MY
KCM|Kahramanmaraş|Kahramanmaraş|TR
KCT|Koggala|Galle|LK
KCY|Krasnoyarsk Cheremshanka|Krasnoyarsk|RU
KDL|Kärdla|Kärdla|EE
KDM|Kaadedhdhoo|Huvadhu Atoll|MV
KDO|Kadhdhoo|Kadhdhoo|MV
KEM|Kemi-Tornio|Kemi / Tornio|FI
KEP|Nepalgunj|Nepalgunj|NP
KET|Kengtung|Kengtung|MM
KGA|Kananga|Kananga|CD
KGC|Kingscote||AU
KGI|Kalgoorlie Boulder|Broadwood|AU
KGP|Kogalym|Kogalym|RU
KGT|Kangding|Garzê|CN
KHD|Khoram Abad||IR
KHE|Kherson|Kherson|UA
KHK|Khark|Khark|IR
KHS|Khasab|Khasab|OM
KHT|Khost|Khost|AF
KHV|Khabarovsk Novy|Khabarovsk|RU
KHX|Savannah Airstrip|Kihihi|UG
KIR|Kerry|Farranfore|IE
KJB|Kurnool|Orvakal|IN
KJH|Kaili Huangping|Kaili|CN
KJI|Burqin Kanas|Burqin|CN
KJT|Kertajati|Kertajati|ID
KKC|Khon Kaen|Khon Kaen|TH
KKE|Kerikeri|Kerikeri|NZ
KKN|Kirkenes Airport, Høybuktmoen|Kirkenes|NO
KKR|Kaukura|Raitahiti|PF
KKS|Kashan|Kashan|IR
KKW|Kikwit|Kikwit|CD
KKX|Kikai|Kikai|JP
KLH|Kolhapur|Kolhapur|IN
KLR|Kalmar|Kalmar|SE
KLW|Klawock|Klawock|US
KLX|Kalamata|Kalamata|GR
KMA|Kerema|Kerema|PG
KMC|King Khaled Military City|King Khaled Military City|SA
KME|Kamembe|Kamembe|RW
KMW|Kostroma Sokerkino|Kostroma|RU
KND|Kindu|Kindu|CD
KNG|Utarom|Kaimana|ID
KNH|Kinmen|Shang-I|TW
KNQ|Koné|Koné|NC
KNS|King Island||AU
KNU|Kanpur|Kanpur|IN
KNX|East Kimberley Regional (Kununurra)|Kununurra|AU
KOE|El Tari|Kupang|ID
KOI|Kirkwall|Kirkwall, Orkney Islands|GB
KOK|Kokkola-Pietarsaari|Kokkola / Kruunupyy|FI
KOP|Nakhon Phanom|Nakhon Phanom|TH
KPO|Pohang Airport (G-815/K-3)|Pohang|KR
KPW|Keperveem|Keperveem|RU
KQH|Kishangarh Airport Ajmer|Ajmer|IN
KRF|Kramfors-Sollefteå Höga Kusten|Nyland|SE
KRL|Korla Licheng|Korla|CN
KRO|Kurgan|Kurgan|RU
KRP|Midtjyllands Airport / Air Base Karup|Karup|DK
KRW|Turkmenbaşy|Turkmenbaşy|TM
KSC|Košice|Košice|SK
KSD|Karlstad|Karlstad|SE
KSH|Shahid Ashrafi Esfahani|Kermanshah|IR
KSL|Kassala|Kassala|SD
KSU|Kristiansund Airport, Kvernberget|Kvernberget|NO
KSY|Kars|Kars|TR
KSZ|Kotlas|Kotlas|RU
KTA|Karratha|Karratha|AU
KTD|Kitadaito|Kitadaitōjima|JP
KTG|Rahadi Osman|Ketapang|ID
KTN|Ketchikan|Ketchikan|US
KTP|Tinson Pen|Tinson Pen|JM
KUA|Kuantan|Kuantan|MY
KUH|Kushiro|Kushiro|JP
KUM|Yakushima|Yakushima|JP
KUS|Kulusuk|Kulusuk|GL
KUU|Kullu Manali|Bhuntar|IN
KUV|Gunsan Airport / Gunsan Air Base|Gunsan|KR
KVG|Kavieng|Kavieng|PG
KVO|Morava|Kraljevo|RS
KVX|Pobedilovo|Kirov|RU
KWA|Bucholz Army Air Field|Kwajalein|MH
KWG|Kryvyi Rih|Kryvyi Rih|UA
KWJ|Gwangju|Gwangju|KR
KWM|Kowanyama|Kowanyama|AU
KWZ|Kolwezi|Kolwezi|CD
KXB|Sangia Nibandera|Kolaka|ID
KXK|Komsomolsk-on-Amur|Komsomolsk-on-Amur|RU
KYD|Lanyu|Orchid Island|TW
KYP|Kyaukpyu|Kyaukpyu|MM
KYS|Kayes Dag Dag|Kayes|ML
KYZ|Kyzyl|Kyzyl|RU
KZI|Kozani National Airport Filippos|Kozani|GR
LAF|Purdue University|West Lafayette|US
LAJ|Lages|Lages|BR
LAL|Lakeland Linder|Lakeland|US
LAN|Capital Region|Lansing|US
LAP|Manuel Márquez de León|La Paz|MX
LAR|Laramie Regional|Laramie|US
LAU|Manda|Lamu|KE
LAW|Lawton Fort Sill Regional|Lawton|US
LBB|Lubbock Preston Smith|Lubbock|US
LBC|Lübeck Blankensee|Lübeck|DE
LBE|Arnold Palmer Regional|Latrobe|US
LBF|North Platte Regional Airport Lee Bird Field|North Platte|US
LBL|Liberal Mid-America Regional|Liberal|US
LBS|Labasa|Labasa|FJ
LBU|Labuan|Labuan|MY
LCE|Golosón|La Ceiba|HN
LCG|A Coruña|Culleredo|ES
LCH|Lake Charles Regional|Lake Charles|US
LCK|Rickenbacker|Columbus|US
LCX|Liancheng Guanzhishan|Longyan|CN
LCY|London City|London|GB
LDB|Governor José Richa|Londrina|BR
LDE|Tarbes-Lourdes-Pyrénées|Tarbes/Lourdes/Pyrénées|FR
LDS|Yichun Lindu|Yichun|CN
LDU|Lahad Datu|Lahad Datu|MY
LDX|Saint-Laurent-du-Maroni|Saint-Laurent-du-Maroni|GF
LDY|City of Derry|Derry, Derry and Strabane|GB
LEA|Learmonth|Exmouth|AU
LEB|Lebanon Municipal|Lebanon|US
LEI|Almería|Almería|ES
LEN|León|La Virgen del Camino|ES
LER|Leinster||AU
LET|Alfredo Vásquez Cobo|Leticia|CO
LEU|Pirineus - la Seu d'Urgel|La Seu d'Urgell Pyrenees and Andorra|ES
LEX|Blue Grass|Lexington|US
LFM|Lamerd|Lamerd|IR
LFQ|Linfen Yaodu|Linfen|CN
LFT|Lafayette Regional|Lafayette|US
LGG|Liège|Grâce-Hollogne|BE
LGI|Deadman's Cay|Deadman's Cay|BS
LHG|Lightning Ridge||AU
LHL|Lachin|Lachin|AZ
LHS|Las Heras|Las Heras|AR
LIF|Lifou|Lifou|NC
LIG|Limoges|Limoges/Bellegarde|FR
LIO|Limón|Limón|CR
LIT|Bill & Hillary Clinton National Airport/Adams Field|Little Rock|US
LIW|Loikaw|Loikaw|MM
LKL|Lakselv Airport, Banak|Lakselv|NO
LKN|Leknes|Leknes|NO
LLF|Yongzhou Lingling|Yongzhou|CN
LLV|Lüliang Dawu|Lüliang|CN
LME|Le Mans-Arnage|Le Mans, Sarthe|FR
LMM|Valle del Fuerte|Los Mochis|MX
LMN|Limbang|Limbang|MY
LMP|Lampedusa|Lampedusa|IT
LNJ|Lincang Boshang|Lincang|CN
LNK|Lincoln|Lincoln|US
LNL|Longnan Chengzhou|Longnan|CN
LNO|Leonora|Leonora|AU
LNS|Lancaster|Lancaster|US
LNY|Lanai|Lanai City|US
LOE|Loei||TH
LPF|Liupanshui Yuezhao|Liupanshui|CN
LPK|Lipetsk|Lipetsk|RU
LPT|Lampang||TH
LRD|Laredo|Laredo|US
LRE|Longreach|Longreach|AU
LRH|La Rochelle Île de Ré|La Rochelle|FR
LRR|Lar|Lar|IR
LRT|Lorient South Brittany (Bretagne Sud)|Lorient/Lann/Bihoué|FR
LRU|Las Cruces|Las Cruces|US
LSC|La Florida|La Serena-Coquimbo|CL
LSE|La Crosse Regional|La Crosse|US
LSG|Leshan|Leshan|CN
LSH|Lashio|Lashio|MM
LSI|Sumburgh|Lerwick, Shetland|GB
LSP|Josefa Camejo|Paraguaná|VE
LSR|Alas Leuser|Kutacane|ID
LST|Launceston|Launceston|AU
LSY|Lismore|Lismore|AU
LTD|Ghadames|Ghadames|LY
LTI|Altai|Altai|MN
LTK|Latakia|Latakia|SY
LTM|Lethem|Lethem|GY
LTU|Murod Kond|Latur|IN
LTX|Cotopaxi|Latacunga|EC
LUA|Tenzing-Hillary|Lukla|NP
LUD|Luderitz|Luderitz|NA
LUG|Lugano|Agno|CH
LUK|Cincinnati Municipal Airport Lunken Field|Cincinnati|US
LUM|Dehong Mangshi|Dehong|CN
LUQ|Brigadier Mayor D Cesar Raul Ojeda|San Luis|AR
LUR|Cape Lisburne LRRS|Cape Lisburne|US
LUV|Karel Sadsuitubun|Langgur|ID
LWB|Greenbrier Valley|Lewisburg|US
LWS|Lewiston Nez Perce County|Lewiston|US
LYC|Lycksele|Lycksele|SE
LYH|Lynchburg Regional Airport - Preston Glenn Field|Lynchburg|US
LYI|Linyi Qiyang|Linyi|CN
LYR|Svalbard Airport, Longyear|Longyearbyen|NO
LZG|Langzhong Gucheng|Nanchong|CN
LZH|Liuzhou Bailian Airport / Bailian Air Base|Liuzhou|CN
LZN|Matsu Nangan|Matsu|TW
LZO|Luzhou Yunlong|Luzhou|CN
LZY|Nyingchi Mainling|Nyingchi|CN
MAB|João Correa da Rocha|Marabá|BR
MAF|Midland International Air and Space Port|Midland|US
MAG|Madang|Madang|PG
MAK|Malakal|Malakal|SS
MAM|General Servando Canales|Matamoros|MX
MAQ|Mae Sot||TH
MAS|Momote|Manus Island|PG
MAU|Maupiti||PF
MAZ|Eugenio Maria De Hostos|Mayaguez|PR
MBD|Mmabatho|Mafeking|ZA
MBE|Monbetsu|Monbetsu|JP
MBI|Songwe|Mbeya|TZ
MBS|MBS|Freeland|US
MBT|Moises R. Espinosa|Masbate|PH
MBW|Melbourne Moorabbin|Melbourne|AU
MBX|Maribor Edvard Rusjan|Maribor|SI
MCE|Merced Regional Macready Field|Merced|US
MCG|McGrath|McGrath|US
MCK|McCook Ben Nelson Regional|McCook|US
MCN|Middle Georgia Regional|Macon|US
MCP|Macapá - Alberto Alcolumbre|Macapá|BR
MCW|Mason City Municipal|Mason City|US
MDG|Mudanjiang Hailang|Mudanjiang|CN
MDI|Makurdi|Makurdi|NG
MDK|Mbandaka|Mbandaka|CD
MDQ|Ástor Piazzola|Mar del Plata|AR
MDT|Harrisburg|Harrisburg|US
MDU|Mendi|Mendi|PG
MEB|Melbourne Essendon|Essendon Fields|AU
MEC|Eloy Alfaro|Manta|EC
MEE|Maré|Maré|NC
MEG|Malanje|Malanje|AO
MEH|Mehamn|Mehamn|NO
MEI|Key Field / Meridian Regional|Meridian|US
MEQ|Cut Nyak Dhien|Kuala Pesisir|ID
MFE|McAllen Miller|McAllen|US
MFK|Matsu Beigan|Matsu|TW
MFR|Rogue Valley International-Medford|Medford|US
MGB|Mount Gambier|Mount Gambier|AU
MGC|Michigan City Municipal|Michigan City|US
MGF|Regional de Maringá - Sílvio Name Júnior|Maringá|BR
MGH|Margate|Margate|ZA
MGM|Montgomery Regional (Dannelly Field)|Montgomery|US
MGW|Morgantown Municipal Airport Walter L. (Bill) Hart Field|Morgantown|US
MGZ|Myeik|Mkeik|MM
MHG|Mannheim-City|Mannheim|DE
MHH|Leonard M. Thompson|Marsh Harbour|BS
MHK|Manhattan Regional|Manhattan|US
MHQ|Mariehamn|Mariehamn|FI
MHT|Manchester-Boston Regional|Manchester|US
MHU|Mount Hotham|Mount Hotham|AU
MIG|Mianyang Nanjiao|Mianyang|CN
MII|Frank Miloye Milenkowichi–Marília State|Marília|BR
MIM|Merimbula|Merimbula|AU
MIR|Monastir Habib Bourguiba|Monastir|TN
MJF|Mosjøen Airport, Kjærstad|Mosjøen|NO
MJK|Shark Bay|Denham|AU
MJM|Mbuji Mayi|Mbuji Mayi|CD
MJT|Mytilene|Mytilene|GR
MJZ|Mirny|Mirny|RU
MKG|Muskegon County|Muskegon|US
MKK|Molokai|Kaunakakai|US
MKL|McKellar-Sipes Regional|Jackson|US
MKM|Mukah|Mukah|MY
MKP|Makemo|Makemo|PF
MKQ|Mopah|Merauke|ID
MKR|Meekatharra||AU
MKU|Makokou|Makokou|GA
MKW|Rendani|Manokwari|ID
MKY|Mackay|Mackay|AU
MKZ|Malacca|Malacca|MY
MLB|Melbourne Orlando|Melbourne|US
MLG|Abdul Rachman Saleh|Malang|ID
MLI|Quad City|Moline|US
MLN|Melilla|Melilla|ES
MLU|Monroe Regional|Monroe|US
MLW|Spriggs Payne|Monrovia|LR
MLX|Malatya Erhaç|Malatya|TR
MMB|Memanbetsu|Ōzora|JP
MMD|Minamidaito|Minamidaito|JP
MME|Teesside|Darlington, Durham|GB
MMG|Mount Magnet||AU
MMH|Mammoth Yosemite|Mammoth Lakes|US
MMJ|Shinshu-Matsumoto|Matsumoto|JP
MMO|Maio|Vila do Maio|CV
MMY|Miyako|Miyakojima|JP
MNC|Nacala|Nacala|MZ
MNG|Maningrida|Maningrida|AU
MNJ|Mananjary|Mananjary|MG
MNX|Manicoré|Manicoré|BR
MOB|Mobile Regional|Mobile|US
MOC|Mário Ribeiro|Montes Claros|BR
MOG|Mong Hsat|Mong Hsat|MM
MOL|Molde Airport, Årø|Årø|NO
MOQ|Morondava|Morondava|MG
MOT|Minot|Minot|US
MOV|Moranbah|Moranbah|AU
MOZ|Moorea Temae|Moorea-Maiao|PF
MPA|Katima Mulilo|Mpacha|NA
MPH|Godofredo P. Ramos|Caticlan|PH
MPW|Mariupol|Mariupol|UA
MPY|Maripasoula|Maripasoula|GF
MQJ|Moma|Khonuu|RU
MQL|Mildura|Mildura|AU
MQM|Mardin|Mardin|TR
MQN|Mo i Rana Airport, Røssvoll|Mo i Rana|NO
MQS|Mustique|Lovell|VC
MQT|Marquette/Sawyer|Gwinn|US
MQX|Mekele Alula Aba Nega|Mekele|ET
MRE|Mara Serena Lodge Airstrip|Serena|KE
MRI|Merrill Field|Anchorage|US
MRX|Mahshahr|Mahshahr|IR
MRY|Monterey Regional|Monterey|US
MRZ|Moree|Moree|AU
MSJ|Misawa Airport / Misawa Air Base|Misawa|JP
MSL|Northwest Alabama Regional|Muscle Shoals|US
MSN|Dane County Regional Truax Field|Madison|US
MSO|Missoula Montana|Missoula|US
MSR|Muş|Muş|TR
MSS|Massena International Airport Richards Field|Massena|US
MSZ|Welwitschia Mirabilis|Moçâmedes|AO
MTJ|Montrose Regional|Montrose|US
MTR|Los Garzones|Montería|CO
MTT|Minatitlán/Coatzacoalcos|Cosoleacaque|MX
MUA|Munda|Munda|SB
MUE|Waimea Kohala|Waimea|US
MUN|José Tadeo Monagas|Maturín|VE
MUR|Marudi|Marudi|MY
MVB|M'Vengue El Hadj Omar Bongo Ondimba|Franceville|GA
MVF|Dix-Sept Rosado|Mossoró|BR
MVP|Fabio Alberto Leon Bentley|Mitú|CO
MVQ|Mogilev|Mogilev|BY
MVR|Salak|Maroua|CM
MVT|Mataiva||PF
MWA|Veterans Airport of Southern Illinois|Marion|US
MWL|Mineral Wells Regional|Mineral Wells|US
MXL|General Rodolfo Sánchez Taboada|Mexicali|MX
MXV|Mörön|Mörön|MN
MXX|Mora|Mora|SE
MYA|Moruya|Moruya|AU
MYD|Malindi|Malindi|KE
MYE|Miyakejima|Miyakejima|JP
MYG|Mayaguana|Abraham Bay Settlement|BS
MYL|McCall Municipal|McCall|US
MYP|Mary|Mary|TM
MYQ|Mysore|Mysore|IN
MYT|Myitkyina|Myitkyina|MM
MYU|Mekoryuk|Mekoryuk|US
MYW|Mtwara|Mtwara|TZ
MYY|Miri|Miri|MY
MZI|Mopti|Sévaré|ML
MZL|La Nubia|Manizales|CO
MZO|Sierra Maestra|Manzanillo|CU
MZQ|Mkuze|Mkuze|ZA
MZS|Moradabad|Moradabad|IN
MZV|Mulu|Mulu|MY
NAA|Narrabri|Narrabri|AU
NAH|Naha|Tabukan Utara, Sangihe Islands|ID
NAL|Nalchik|Nalchik|RU
NAM|Namniwel|Namniwel|ID
NAQ|Qaanaaq|Qaanaaq|GL
NAW|Narathiwat||TH
NBC|Begishevo|Nizhnekamsk|RU
NBE|Enfidha - Hammamet|Enfidha|TN
NBS|Changbaishan|Baishan|CN
NCA|North Caicos|North Caicos|TC
NCY|Annecy Meythet airport|Annecy|FR
NDC|Nanded|Nanded|IN
NDU|Rundu|Rundu|NA
NEC|Necochea|Necochea|AR
NER|Chulman|Neryungri|RU
NEV|Vance W. Amory|Charlestown|KN
NFG|Nefteyugansk|Nefteyugansk|RU
NGE|N'Gaoundéré|N'Gaoundéré|CM
NGQ|Ngari Gunsa|Shiquanhe|CN
NHV|Nuku Hiva|Nuku Hiva|PF
NKM|Nagoya Airport / JASDF Komaki Air Base|Nagoya|JP
NKT|Şırnak Şerafettin Elçi|Şırnak|TR
NLD|Quetzalcóatl|Nuevo Laredo|MX
NLH|Ninglang Luguhu|Ninglang|CN
NLI|Nikolayevsk-na-Amure|Nikolayevsk-na-Amure Airport|RU
NLK|Norfolk Island|Burnt Pine|NF
NLT|Xinyuan Nalati|Xinyuan|CN
NMF|Maafaru|Noonu Atoll|MV
NNM|Naryan Mar|Naryan Mar|RU
NNT|Nan||TH
NOB|Nosara|Nicoya|CR
NOJ|Noyabrsk|Noyabrsk|RU
NOP|Sinop|Sinop|TR
NOV|Albano Machado|Huambo|AO
NOZ|Spichenkovo|Novokuznetsk|RU
NPE|Hawke's Bay|Napier|NZ
NPL|New Plymouth|New Plymouth|NZ
NPO|Nanga Pinoh|Nanga Pinoh-Borneo Island|ID
NPT|Newport State|Newport|US
NQY|Cornwall Airport Newquay|Newquay|GB
NRA|Narrandera|Narrandera|AU
NRK|Norrköping|Norrköping|SE
NRR|José Aponte de la Torre|Ceiba|PR
NSH|Nowshahr|Nowshahr|IR
NSN|Nelson|Nelson|NZ
NST|Nakhon Si Thammarat|Nakhon Si Thammarat|TH
NTE|Nantes Atlantique|Nantes|FR
NTG|Nantong Xingdong|Nantong|CN
NTN|Normanton|Normanton|AU
NTQ|Noto Satoyama|Wajima|JP
NTX|Ranai|Ranai-Natuna Besar Island|ID
NUI|Nuiqsut|Nuiqsut|US
NUX|Novy Urengoy|Novy Urengoy|RU
NVA|Benito Salas|Neiva|CO
NVI|Navoi|Navoi|UZ
NWI|Norwich|Norwich, Norfolk|GB
NYA|Nyagan|Nyagan|RU
NYI|Sunyani|Sunyani|GH
NYK|Nanyuki Civil|Gathiuru|KE
NYM|Nadym|Nadym|RU
NZC|Maria Reiche Neuman|Nazca|PE
NZH|Manzhouli Xijiao|Manzhouli|CN
NZL|Zhalantun Genghis Khan|Zhalantun|CN
OAJ|Albert J Ellis|Richlands|US
OBO|Tokachi-Obihiro|Obihiro|JP
OCC|Francisco De Orellana|Coca|EC
OCE|Ocean City Municipal|Ocean City|US
OCJ|Ian Fleming|Boscobel|JM
ODB|Córdoba|Córdoba|ES
OER|Örnsköldsvik|Örnsköldsvik|SE
OGD|Ogden Hinckley|Ogden|US
OGL|Eugene F. Correia|Ogle|GY
OGN|Yonaguni|Yonaguni|JP
OGS|Ogdensburg|Ogdensburg|US
OGU|Ordu–Giresun|Ordu|TR
OGX|Ain Beida|Ouargla|DZ
OGZ|Vladikavkaz Beslan|Beslan|RU
OHE|Mohe Gulian|Mohe|CN
OHO|Okhotsk|Okhotsk|RU
OIM|Oshima|Izu Oshima|JP
OIR|Okushiri|Okushiri Island|JP
OIT|Oita|Oita|JP
OKD|Sapporo Okadama|Sapporo|JP
OKE|Okinoerabu|Wadomari|JP
OKI|Oki Global Geopark|Okinoshima|JP
OKL|Oksibil|Oksibil|ID
OKY|Oakey Army Aviation Centre||AU
OLA|Ørland|Ørland|NO
OLF|L M Clayton|Wolf Point|US
OLM|Olympia Regional|Olympia|US
OLZ|Olyokminsk|Olyokminsk|RU
OMD|Oranjemund|Oranjemund|NA
OME|Nome|Nome|US
OMH|Urmia|Urmia|IR
OMN|Zomin|Zomin|UZ
OND|Ondangwa|Ondangwa|NA
ONJ|Odate Noshiro|Kitaakita|JP
ONQ|Zonguldak Çaycuma|Zonguldak|TR
ONX|Enrique Adolfo Jimenez|Colón|PA
OOM|Cooma Snowy Mountains|Cooma|AU
OPF|Miami-Opa Locka Executive|Miami|US
OPU|Balimo|Balimo|PG
ORB|Örebro|Örebro|SE
ORH|Worcester Regional|Worcester|US
ORT|Northway|Northway|US
OSD|Åre Östersund|Östersund|SE
OSI|Osijek|Osijek|HR
OSW|Orsk|Orsk|RU
OTH|Southwest Oregon Regional|North Bend|US
OTZ|Ralph Wien Memorial|Kotzebue|US
OUZ|Tazadit|Zouérate|MR
OVS|Sovetskiy|Sovetskiy|RU
OWB|Owensboro Daviess County|Owensboro|US
OYE|Oyem|Oyem|GA
OZC|Labo|Ozamiz|PH
PAB|Bilaspur|Bilaspur|IN
PAC|Marcos A. Gelabert|Albrook|PA
PAE|Seattle Paine Field|Everett|US
PAG|Pagadian|Pagadian|PH
PAH|Barkley Regional|Paducah|US
PAT|Jay Prakash Narayan|Patna|IN
PAV|Paulo Afonso|Paulo Afonso|BR
PAZ|El Tajín National|Poza Rica|MX
PBD|Porbandar|Porbandar|IN
PBG|Plattsburgh|Plattsburgh|US
PBO|Paraburdoo|Paraburdoo|AU
PBR|Puerto Barrios|Puerto Barrios|GT
PBU|Putao|Putao|MM
PCP|Principe|São Tomé & Príncipe|ST
PCR|German Olano|Puerto Carreño|CO
PDA|Obando Cesar Gaviria Trujillo|Puerto Inírida|CO
PDK|DeKalb Peachtree|Atlanta|US
PDO|Pendopo|Talang Gudang-Sumatra Island|ID
PDP|Capitan Corbeta CA Curbelo|Punta del Este|UY
PDS|Piedras Negras|Piedras Negras|MX
PDT|Eastern Oregon Regional Airport at Pendleton|Pendleton|US
PEI|Matecaña|Pereira|CO
PEM|Padre Aldamiz|Puerto Maldonado|PE
PES|Petrozavodsk|Petrozavodsk|RU
PET|João Simões Lopes Neto|Pelotas|BR
PEX|Pechora|Pechora|RU
PEZ|Penza|Penza|RU
PFB|Lauro Kurtz|Passo Fundo|BR
PGA|Page Municipal|Page|US
PGD|Punta Gorda|Punta Gorda|US
PGF|Perpignan-Rivesaltes (Llabanère)|Perpignan/Rivesaltes|FR
PGH|Pantnagar|Pantnagar|IN
PGK|Depati Amir|Pangkal Pinang|ID
PGU|Persian Gulf|Khiyaroo|IR
PGV|Pitt-Greenville|Greenville|US
PGZ|Ponta Grossa Airport - Comandante Antonio Amilton Beraldo|Ponta Grossa|BR
PHB|Parnaíba - Prefeito Doutor João Silva Filho|Parnaíba|BR
PHF|Newport News Williamsburg|Newport News|US
PHG|Port Harcourt City Airport / Port Harcourt Air Force Base|Port Harcourt|NG
PHS|Phitsanulok|Phitsanulok|TH
PHW|Hendrik Van Eck|Phalaborwa|ZA
PHY|Phetchabun||TH
PIA|General Wayne A. Downing Peoria|Peoria|US
PIB|Hattiesburg Laurel Regional|Moselle|US
PIH|Pocatello Regional|Pocatello|US
PIR|Pierre Regional|Pierre|US
PIS|Poitiers-Biard|Poitiers/Biard|FR
PIU|PAF Captain Guillermo Concha Iberico|Piura|PE
PIX|Pico|Pico Island|PT
PIZ|Point Lay LRRS|Point Lay|US
PJM|Puerto Jimenez|Puerto Jimenez|CR
PKB|Mid Ohio Valley Regional|Parkersburg|US
PKE|Parkes|Parkes|AU
PKR|Pokhara Domestic|Pokhara|NP
PKU|Sultan Syarif Kasim II International Airport / Roesmin Nurjadin AFB|Pekanbaru|ID
PKV|Princess Olga Pskov|Pskov|RU
PKY|Tjilik Riwut|Palangkaraya|ID
PLJ|Placencia|Placencia|BZ
PLM|Sultan Mahmud Badaruddin II|Palembang|ID
PLN|Pellston Regional Airport of Emmet County|Pellston|US
PLO|Port Lincoln|Port Lincoln|AU
PLW|Mutiara - SIS Al-Jufrie|Palu|ID
PMF|Parma|Parma|IT
PMG|Ponta Porã|Ponta Porã|BR
PMQ|Perito Moreno Jalil Hamer|Perito Moreno|AR
PMR|Palmerston North|Palmerston North|NZ
PMW|Brigadeiro Lysias Rodrigues|Palmas|BR
PMY|El Tehuelche|Puerto Madryn|AR
PNA|Pamplona|Pamplona|ES
PNI|Pohnpei|Pohnpei Island|FM
PNL|Pantelleria|Pantelleria|IT
PNP|Girua|Popondetta|PG
PNT|Lieutenant Julio Gallardo|Puerto Natales|CL
PNY|Pondicherry|Puducherry|IN
PNZ|Senador Nilo Coelho|Petrolina|BR
POL|Pemba|Pemba|MZ
POP|Gregorio Luperon|Puerto Plata|DO
POR|Pori|Pori|FI
PPB|Presidente Prudente|Presidente Prudente|BR
PPN|Guillermo León Valencia|Popayán|CO
PPP|Proserpine Whitsunday Coast|Proserpine|AU
PQI|Presque Isle|Presque Isle|US
PQQ|Port Macquarie|Port Macquarie|AU
PRA|General Urquiza|Parana|AR
PRC|Prescott Regional Airport - Ernest A. Love Field|Prescott|US
PRI|Praslin Island|Praslin Island|SC
PRM|Portimão|Portimão|PT
PSC|Tri Cities|Pasco|US
PSE|Mercedita|Ponce|PR
PSG|Petersburg James A Johnson|Petersburg|US
PSM|Portsmouth International Airport at Pease|Portsmouth|US
PSO|Antonio Nariño|Chachagüí|CO
PSS|Libertador Gral D Jose De San Martin|Posadas|AR
PSU|Pangsuma|Putussibau-Borneo Island|ID
PSZ|Capitán Av. Salvador Ogaya G. airport|Puerto Suárez|BO
PTH|Port Heiden|Port Heiden|US
PTJ|Portland||AU
PTU|Platinum|Platinum|US
PUB|Pueblo Memorial|Pueblo|US
PUD|Puerto Deseado|Puerto Deseado|AR
PUF|Pau Pyrénées|Pau/Pyrénées|FR
PUG|Port Augusta||AU
PUU|Tres De Mayo|Puerto Asís|CO
PUW|Pullman-Moscow Regional|Pullman|US
PUZ|Puerto Cabezas|Puerto Cabezas|NI
PVA|El Embrujo|Providencia|CO
PVK|Aktion National|Preveza|GR
PVU|Provo Municipal|Provo|US
PWE|Pevek|Apapelgino|RU
PXM|Puerto Escondido|Puerto Escondido|MX
PXO|Porto Santo|Vila Baleira|PT
PXR|Surin|Surin|TH
PXU|Pleiku|Pleiku|VN
PYJ|Polyarny|Yakutia|RU
PZB|Pietermaritzburg|Pietermaritzburg|ZA
PZH|Zhob|Fort Sandeman|PK
PZI|Panzhihua Bao'anying|Panzhihua|CN
QBC|Bella Coola|Bella Coola|CA
QOW|Sam Mbakwe International Cargo|Owerri|NG
QRW|Warri|Okpe|NG
QSF|Ain Arnat|Sétif|DZ
QSR|Salerno Costa d'Amalfi|Salerno|IT
QSZ|Shache|Shache|CN
QUO|Akwa Ibom|Uyo|NG
RAB|Tokua|Kokopo|PG
RAE|Arar Domestic|Arar|SA
RAH|Rafha Domestic|Rafha|SA
RAO|Leite Lopes|Ribeirão Preto|BR
RAP|Rapid City Regional|Rapid City|US
RAS|Sardar-e-Jangal|Rasht|IR
RBY|Ruby|Ruby|US
RCB|Richards Bay|Richards Bay|ZA
RCH|Almirante Padilla|Riohacha|CO
RDD|Redding Municipal|Redding|US
RDM|Roberts Field|Redmond|US
RDO|Warsaw Radom|Radom|PL
RDP|Kazi Nazrul Islam|Durgapur|IN
RDZ|Rodez–Aveyron|Rodez/Marcillac|FR
REG|Reggio Calabria|Reggio Calabria|IT
REL|Almirante Marco Andres Zar|Rawson|AR
REN|Orenburg Central|Orenburg|RU
RER|Retalhuleu|Retalhuleu|GT
REW|Rewa Airport, Chorhata, REWA|Rewa|IN
REX|General Lucio Blanco|Reynosa|MX
RFD|Chicago Rockford|Chicago/Rockford|US
RFP|Raiatea|Uturoa|PF
RGA|Gobernador Ramón Trejo Noel|Rio Grande|AR
RGI|Rangiroa||PF
RGO|Orang (Chongjin)|Hoemun-ri|KP
RHD|Termas de Río Hondo international|Termas de Río Hondo|AR
RHI|Rhinelander Oneida County|Rhinelander|US
RIA|Santa Maria|Santa Maria|BR
RIB|Capitán Av. Selin Zeitun Lopez|Riberalta|BO
RIS|Rishiri|Rishiri|JP
RIW|Central Wyoming Regional|Riverton|US
RIZ|Rizhao Shanzihe|Rizhao|CN
RJA|Rajahmundry|Madhurapudi|IN
RJH|Shah Makhdum|Rajshahi|BD
RJN|Rafsanjan|Rafsanjan|IR
RKD|Knox County Regional|Rockland|US
RKE|Copenhagen Roskilde|Roskilde|DK
RKS|Southwest Wyoming Regional|Rock Springs|US
RKV|Reykjavík Domestic|Reykjavík|IS
RLG|Rostock-Laage|Laage|DE
RLK|Bayannur Tianjitai|Bayannur|CN
RMA|Roma|Roma|AU
RMZ|Tobolsk Remezov|Tobolsk|RU
RNB|Ronneby|Ronneby|SE
RNJ|Yoron|Yoron|JP
RNN|Bornholm|Rønne|DK
RNS|Rennes-Saint-Jacques|Saint-Jacques-de-la-Lande, Ille-et-Vilaine|FR
ROA|Roanoke–Blacksburg Regional|Roanoke|US
ROI|Roi Et|Roi Et|TH
ROK|Rockhampton|Rockhampton|AU
ROO|Maestro Marinho Franco|Rondonópolis|BR
ROT|Rotorua Regional|Rotorua|NZ
ROW|Roswell Air Center|Roswell|US
RPR|Swami Vivekananda|Raipur|IN
RQA|Ruoqiang Loulan|Ruoqiang Town|CN
RRG|Sir Charles Gaetan Duval|Port Mathurin|MU
RRJ|Jacarepaguá - Roberto Marinho|Rio de Janeiro|BR
RRS|Røros|Røros|NO
RSA|Santa Rosa|Santa Rosa|AR
RSD|Rock Sound|Rock Sound|BS
RST|Rochester|Rochester|US
RSU|Yeosu|Yeosu|KR
RUA|Arua|Arua|UG
RUR|Rurutu||PF
RUT|Rutland - Southern Vermont Regional|Rutland|US
RVK|Rørvik Airport, Ryum|Rørvik|NO
RVY|Pres. Gral. Óscar D. Gestido Binational|Rivera/Santana do Livramento|UY
RWN|Rivne|Rivne|UA
RXS|Roxas|Roxas City|PH
RYB|Staroselye|Rybinsk|RU
RYK|Shaikh Zaid|Rahim Yar Khan|PK
RZR|Ramsar|Ramsar|IR
SAB|Juancho E. Yrausquin|Zion's Hill|BQ
SAF|Santa Fe Municipal|Santa Fe|US
SAQ|San Andros|Andros Island|BS
SBA|Santa Barbara Municipal|Santa Barbara|US
SBH|St. Jean|Gustavia|BL
SBN|South Bend|South Bend|US
SBP|San Luis County Regional|San Luis Obispo|US
SBT|Sabetta|Sabetta|RU
SBW|Sibu|Sibu|MY
SBY|Salisbury Ocean City Wicomico Regional|Salisbury|US
SCC|Deadhorse|Deadhorse|US
SCE|State College Regional|State College|US
SCK|Stockton Metropolitan|Stockton|US
SCN|Saarbrücken|Saarbrücken|DE
SCT|Socotra|Mori|YE
SCW|Syktyvkar|Syktyvkar|RU
SDD|Lubango Mukanka|Lubango|AO
SDE|Vicecomodoro Angel D. La Paz Aragonés|Santiago del Estero|AR
SDG|Sanandaj||IR
SDK|Sandakan|Sandakan|MY
SDL|Sundsvall-Härnösand|Sundsvall/ Härnösand|SE
SDP|Sand Point|Sand Point|US
SDR|Seve Ballesteros-Santander|Santander|ES
SDS|Sado|Sado|JP
SDW|Sindhudurg|Chipi|IN
SDY|Sidney - Richland Regional|Sidney|US
SEB|Sabha|Sabha|LY
SEK|Srednekolymsk|Srednekolymsk|RU
SEN|London Southend|Southend-on-Sea, Essex|GB
SFA|Sfax Thyna|Sfax|TN
SFG|Grand Case-l'Espérance|Grand Case|MF
SFJ|Kangerlussuaq|Kangerlussuaq|GL
SFN|Sauce Viejo|Santa Fe|AR
SFT|Skellefteå|Skellefteå|SE
SGD|Sønderborg|Sønderborg|DK
SGF|Springfield Branson National|Springfield|US
SGU|St George Regional|St George|US
SHB|Nakashibetsu|Nakashibetsu|JP
SHD|Shenandoah Valley Regional|Weyers Cave|US
SHI|Shimojishima|Miyakojima|JP
SHL|Shillong|Shillong|IN
SHM|Nanki Shirahama|Shirahama|JP
SHR|Sheridan County|Sheridan|US
SHS|Jingzhou Shashi|Jingzhou|CN
SHV|Shreveport Regional|Shreveport|US
SHW|Sharurah Domestic|Sharurah|SA
SIG|Fernando Luis Ribas Dominicci|San Juan|PR
SIS|Sishen|Sishen|ZA
SIT|Sitka Rocky Gutierrez|Sitka|US
SJE|Jorge E. Gonzalez Torres|San José Del Guaviare|CO
SJI|San Jose|San Jose|PH
SJK|Professor Urbano Ernesto Stumpf|São José Dos Campos|BR
SJL|São Gabriel da Cachoeira|São Gabriel da Cachoeira|BR
SJP|Prof. Eribelto Manoel Reino State|São José do Rio Preto|BR
SJT|San Angelo Regional Mathis Field|San Angelo|US
SJZ|São Jorge|Velas|PT
SKN|Stokmarknes Airport, Skagen|Hadsel|NO
SKZ|Begum Nusrat Bhutto International Airport Sukkur|Sukkur|PK
SLD|Sliač|Sliač|SK
SLE|Salem-Willamette Valley Airport/McNary Field|Salem|US
SLK|Adirondack Regional|Saranac Lake|US
SLM|Salamanca|Salamanca|ES
SLN|Salina Municipal|Salina|US
SLP|Ponciano Arriaga|San Luis Potosí|MX
SLU|George F. L. Charles|Castries|LC
SLW|Plan de Guadalupe|Saltillo|MX
SLY|Salekhard|Salekhard|RU
SMA|Santa Maria|Vila do Porto|PT
SMI|Samos|Samos Island|GR
SML|Stella Maris|Stella Maris|BS
SMN|Lemhi County|Salmon|US
SMR|Simón Bolívar|Santa Marta|CO
SMS|Sainte Marie|Vohilava|MG
SMW|Smara|Smara|EH
SMX|Santa Maria Public Airport Captain G Allan Hancock Field|Santa Maria|US
SNB|Snake Bay|Milikapiti|AU
SNE|Preguiça|Preguiça|CV
SNO|Sakon Nakhon||TH
SNP|St Paul Island|St Paul Island|US
SNR|Saint-Nazaire-Montoir|Saint-Nazaire/Montoir|FR
SNV|Santa Elena de Uairén|Santa Elena de Uairén|VE
SNW|Thandwe|Thandwe|MM
SOB|Hévíz–Balaton|Sármellék|HU
SOJ|Sørkjosen|Sørkjosen|NO
SOM|San Tomé|El Tigre|VE
SON|Santo Pekoa|Luganville|VU
SOQ|Domine Eduard Osok|Sorong|ID
SOU|Southampton|Southampton|GB
SOW|Show Low Regional|Show Low|US
SPC|La Palma|Sta Cruz de la Palma, La Palma Island|ES
SPD|Saidpur|Saidpur|BD
SPI|Abraham Lincoln Capital|Springfield|US
SPN|Saipan|I Fadang, Saipan|MP
SPP|Menongue|Menongue|AO
SPR|John Greif II|San Pedro|BZ
SPS|Wichita Falls Municipal Airport / Sheppard Air Force Base|Wichita Falls|US
SPY|San Pedro||CI
SQD|Shangrao Sanqingshan|Shangrao|CN
SQG|Tebelian|Sintang|ID
SQJ|Sanming Shaxian|Sanming|CN
SQL|San Carlos|San Carlos|US
SRP|Stord Airport, Sørstokken|Leirvik|NO
SRT|Soroti|Soroti|UG
SRY|Sari Dasht-e Naz|Sari|IR
SRZ|El Trompillo|Santa Cruz|BO
SSJ|Sandnessjøen Airport, Stokka|Alstahaug|NO
SST|Santa Teresita|Santa Teresita|AR
SSY|Mbanza Congo|Mbanza Congo|AO
STC|Saint Cloud Regional|Saint Cloud|US
STD|Mayor Buenaventura Vivas|Santo Domingo|VE
STG|St George|St George|US
STM|Santarém - Maestro Wilson Fonseca|Santarém|BR
STS|Charles M. Schulz Sonoma County|Santa Rosa|US
STW|Stavropol Shpakovskoye|Stavropol|RU
STX|Henry E. Rohlsen|Christiansted|VI
SUG|Surigao|Surigao City|PH
SUI|Vladislav Ardzinba Sukhum|Sukhumi|GE
SUJ|Satu Mare|Satu Mare|RO
SUN|Friedman Memorial|Hailey|US
SUX|Sioux Gateway Airport / Brigadier General Bud Day Field|Sioux City|US
SVA|Savoonga|Savoonga|US
SVB|Sambava|Sambava|MG
SVC|Grant County|Silver City|US
SVI|Eduardo Falla Solano|San Vicente Del Caguán|CO
SVJ|Svolvær Airport, Helle|Svolvær|NO
SVL|Savonlinna|Savonlinna|FI
SVZ|Juan Vicente Gómez|San Antonio del Tachira|VE
SWF|New York Stewart|Newburgh|US
SWO|Stillwater Regional|Stillwater|US
SYO|Shonai|Shonai|JP
SYQ|Tobías Bolaños|San Jose|CR
SYS|Saskylakh|Saskylakh|RU
SYY|Stornoway|Stornoway, Western Isles|GB
SZA|Soyo|Soyo|AO
SZF|Samsun-Çarşamba|Samsun|TR
SZH|Shuozhou Zirun|Shuozhou|CN
SZK|Skukuza|Skukuza|ZA
SZY|Olsztyn-Mazury|Szymany|PL
TAC|Daniel Z. Romualdez|Tacloban City|PH
TAH|Whitegrass|Tanna Island|VU
TAI|Taiz|Taiz|YE
TAM|General Francisco Javier Mina|Ciudad Madero|MX
TAP|Tapachula|Tapachula|MX
TAT|Poprad-Tatry|Poprad|SK
TAY|Tartu|Tartu|EE
TBB|Dong Tac|Tuy Hoa|VN
TBH|Tugdan|Tablas Island|PH
TBI|New Bight|Cat Island|BS
TBJ|Tabarka-Aïn Draham|Tabarka|TN
TBN|Waynesville-St. Robert Regional Airport-Forney Field|Fort Leonard Wood|US
TBP|Captain Pedro Canga Rodríguez|Tumbes|PE
TBT|Tabatinga|Tabatinga|BR
TCA|Tennant Creek|Tennant Creek|AU
TCB|Treasure Cay|Treasure Cay|BS
TCO|La Florida|Tumaco|CO
TCP|Taba|Taba|EG
TCQ|Coronel FAP Carlos Ciriani Santa Rosa|Tacna|PE
TCZ|Tengchong Tuofeng|Baoshan|CN
TDD|Teniente Av. Jorge Henrich Arauz|Trinidad|BO
TDK|Taldykorgan|Taldykorgan|KZ
TDX|Trat|Laem Ngop|TH
TEB|Teterboro|Teterboro|US
TEE|Cheikh Larbi Tébessi|Tébessi|DZ
TEN|Tongren Fenghuang|Tongren|CN
TEQ|Tekirdağ Çorlu|Çorlu|TR
TER|Lajes|Praia da Vitória|PT
TEX|Telluride Regional|Telluride|US
TEZ|Tezpur||IN
TFF|Tefé|Tefé|BR
TGG|Sultan Mahmud|Kuala Terengganu|MY
TGJ|Tiga|Tiga|NC
TGK|Taganrog Yuzhny|Taganrog|RU
TGM|Târgu Mureş Transilvania|Recea|RO
TGO|Tongliao|Tongliao|CN
TGR|Touggourt Sidi Madhi|Touggourt|DZ
TGT|Tanga|Tanga|TZ
TGU|Toncontín|Tegucigalpa|HN
TGZ|Angel Albino Corzo|Tuxtla Gutiérrez|MX
THE|Senador Petrônio Portela|Teresina|BR
THG|Thangool|Biloela|AU
THL|Tachileik|Tachileik|MM
THN|Trollhättan-Vänersborg|Trollhättan|SE
THQ|Tianshui Maijishan|Tianshui|CN
THS|Sukhothai||TH
THU|Pituffik Space Base|Pituffik|GL
TIH|Tikehau|Tuherahera|PF
TIM|Mozes Kilangin|Timika|ID
TIN|Tindouf|Tindouf|DZ
TIQ|Francisco Manglona Borja / Tinian|Tinian Island|MP
TIU|Timaru||NZ
TIV|Tivat|Tivat|ME
TIW|Tacoma Narrows|Tacoma|US
TJA|Capitan Oriel Lea Plaza|Tarija|BO
TJG|Warukin|Tanta-Tabalong|ID
TJH|Konotori Tajima|Toyooka|JP
TJK|Tokat|Tokat|TR
TKD|Takoradi|Sekondi-Takoradi|GH
TKF|Truckee Tahoe|Truckee|US
TKG|Radin Inten II|Bandar Lampung|ID
TKN|Tokunoshima|Amagi|JP
TKP|Takapoto||PF
TKX|Takaroa||PF
TLE|Toliara|Toliara|MG
TLH|Tallahassee|Tallahassee|US
TLN|Toulon-Hyères|Hyères, Var|FR
TLQ|Turpan Jiaohe|Turpan|CN
TME|Gustavo Vargas|Tame|CO
TMH|Tanah Merah|Tanah Merah|ID
TMJ|Termez|Termez|UZ
TMT|Trombetas|Oriximiná|BR
TMW|Tamworth|Tamworth|AU
TMX|Timimoun|Timimoun|DZ
TND|Alberto Delgado|Trinidad|CU
TNE|New Tanegashima|Tanegashima|JP
TNH|Tonghua Sanyuanpu|Tonghua|CN
TNJ|Raja Haji Fisabilillah|Tanjung Pinang-Bintan Island|ID
TOD|Tioman|Tioman Island|MY
TOE|Tozeur Nefta|Tozeur|TN
TOL|Eugene F. Kranz Toledo Express|Toledo|US
TOU|Touho|Touho|NC
TOY|Toyama Kitokito|Toyama|JP
TPJ|Taplejung|Taplejung|NP
TPP|Cadete FAP Guillermo Del Castillo Paredes|Tarapoto|PE
TPQ|Amado Nervo National|Tepic|MX
TPS|Vincenzo Florio Airport Trapani-Birgi|Trapani|IT
TRA|Tarama|Tarama|JP
TRC|Francisco Sarabia Tinoco|Torreón|MX
TRE|Tiree|Balemartine, Argyll and Bute|GB
TRG|Tauranga|Tauranga|NZ
TRI|Tri-Cities Regional TN/VA|Blountville|US
TRK|Juwata International Airport / Suharnoko Harbani AFB|Tarakan|ID
TRR|China Bay|Trincomalee|LK
TRT|Toraja|Toraja|ID
TSJ|Tsushima|Tsushima|JP
TSM|Taos Regional|Taos|US
TST|Trang|Trang|TH
TSV|Townsville Airport / RAAF Base Townsville|Townsville|AU
TTA|Tan Tan|Tan Tan|MA
TTE|Sultan Babullah|Ternate|ID
TTJ|Tottori Sand Dunes Conan|Tottori|JP
TTN|Trenton Mercer|Ewing Township|US
TTT|Taitung|Taitung City|TW
TUA|Lieutenant Colonel Luis A. Mantilla|Tulcán|EC
TUB|Tubuai||PF
TUF|Tours Val de Loire|Tours, Indre-et-Loire|FR
TUG|Tuguegarao|Tuguegarao City|PH
TUI|Turaif Domestic|Turaif|SA
TUO|Taupo|Taupo|NZ
TUP|Tupelo Regional|Tupelo|US
TUR|Tucuruí|Tucuruí|BR
TVC|Cherry Capital|Traverse City|US
TVF|Thief River Falls Regional|Thief River Falls|US
TVT|Tashkent-Khumo|Tashkent|UZ
TVY|Dawei|Dawei|MM
TWF|Joslin Field Magic Valley Regional|Twin Falls|US
TWT|Sanga Sanga|Bongao|PH
TWU|Tawau|Tawau|MY
TXE|Rembele|Takengon|ID
TXK|Texarkana Regional Airport (Webb Field)|Texarkana|US
TYF|Torsby|Torsby|SE
TYL|Captain Victor Montes Arias|Talara|PE
TYR|Tyler Pounds Regional|Tyler|US
TZA|Sir Barry Bowen Municipal|Belize City|BZ
TZN|Congo Town|Andros|BS
TZX|Trabzon|Trabzon|TR
UAI|Commander in Chief of FALINTIL, Kay Rala Xanana Gusmão,|Suai|TL
UAQ|Domingo Faustino Sarmiento|San Juan|AR
UBA|Mário de Almeida Franco|Uberaba|BR
UBJ|Yamaguchi Ube|Ube|JP
UBP|Ubon Ratchathani|Ubon Ratchathani|TH
UCB|Ulanqab Jining|Ulanqab|CN
UCT|Ukhta|Ukhta|RU
UDI|Ten. Cel. Aviador César Bombonato|Uberlândia|BR
UDR|Maharana Pratap|Udaipur|IN
UEL|Quelimane|Quelimane|MZ
UEO|Kumejima|Kumejima|JP
UGA|Bulgan|Bulgan|MN
UGU|Bilorai|Bilogai|ID
UIB|El Caraño|Quibdó|CO
UIH|Phu Cat|Quy Nohn|VN
UIN|Quincy Regional Airport Baldwin Field|Quincy|US
UKE|Utkela|Bhawanipatna|IN
UKX|Ust-Kut|Ust-Kut|RU
ULG|Ölgii Mongolei|Ölgii|MN
ULK|Lensk|Lensk|RU
ULO|Ulaangom|Ulaangom|MN
ULP|Quilpie||AU
ULU|Gulu|Gulu|UG
ULV|Ulyanovsk Baratayevka|Ulyanovsk|RU
ULY|Ulyanovsk Vostochny|Cherdakly|RU
UNI|Union Island|Union Island|VC
UNK|Unalakleet|Unalakleet|US
UNN|Ranong|Ranong|TH
UPN|Uruapan - Licenciado y General Ignacio Lopez Rayon|Uruapan|MX
URE|Kuressaare|Kuressaare|EE
URG|Rubem Berta|Uruguaiana|BR
URJ|Uray|Uray|RU
URS|Kursk East|Kursk|RU
URT|Surat Thani|Surat Thani|TH
URY|Gurayat Domestic|Gurayat|SA
USA|Concord-Padgett Regional|Concord|US
USH|Ushuaia - Malvinas Argentinas|Ushuaia|AR
USK|Usinsk|Usinsk|RU
USN|Ulsan|Ulsan|KR
USR|Ust-Nera|Ust-Nera|RU
UST|Northeast Florida Regional|St Augustine|US
USU|Francisco B. Reyes (Busuanga)|Coron|PH
UTN|Upington|Upington|ZA
UTO|Indian Mountain LRRS|Utopia Creek|US
UTT|K. D. Matanzima|Mthatha|ZA
UUA|Bugulma|Bugulma|RU
UVE|Ouvéa|Ouvéa|NC
UYL|Nyala|Nyala|SD
UYN|Yulin Yuyang|Yulin|CN
VAI|Vanimo|Vanimo|PG
VAM|Villa International Airport Maamigili|Maamigili|MV
VAN|Van Ferit Melen|Van|TR
VAQ|Vanavara|Vanavara|RU
VAW|Vardø Airport, Svartnes|Vardø|NO
VBS|Brescia Gabriele d'Annunzio|Montichiari|IT
VCS|Con Dao|Con Dao|VN
VCT|Victoria Regional|Victoria|US
VDC|Glauber de Andrade Rocha|Vitória da Conquista|BR
VDE|El Hierro|El Hierro Island|ES
VDH|Dong Hoi|Dong Hoi|VN
VDM|Gobernador Castello|Viedma / Carmen de Patagones|AR
VDO|Van Don|Van Don|VN
VDS|Vadsø|Vadsø|NO
VDZ|Valdez Pioneer Field|Valdez|US
VEL|Vernal Regional|Vernal|US
VEO|Severo-Yeniseysk|Severo-Yeniseysk|RU
VGO|Vigo|Vigo|ES
VHM|Vilhelmina South Lapland|Vilhelmina|SE
VIG|Juan Pablo Pérez Alfonso|El Vigía|VE
VII|Vinh|Vinh|VN
VIJ|Virgin Gorda|Spanish Town|VG
VIT|Vitoria|Alava|ES
VKG|Rach Gia|Rach Gia|VN
VKT|Vorkuta|Vorkuta|RU
VLD|Valdosta Regional|Valdosta|US
VLL|Valladolid|Valladolid|ES
VLV|Dr. Antonio Nicolás Briceño|Valera|VE
VMU|Baimuru|Baimuru|PG
VNX|Vilankulo|Vilanculo|MZ
VOL|Nea Anchialos National|Nea Anchialos|GR
VOZ|Voronezh|Voronezh|RU
VPE|Ngjiva Pereira|Ngiva|AO
VPN|Vopnafjörður|Vopnafjörður|IS
VPS|Destin-Fort Walton Beach|Valparaiso|US
VPY|Chimoio|Chimoio|MZ
VQS|Antonio Rivera Rodriguez|Vieques|PR
VRB|Vero Beach Regional|Vero Beach|US
VRC|Virac|Virac|PH
VRL|Vila Real|Vila Real|PT
VSE|Aerodromo Goncalves Lobato (Viseu Airport)|Viseu|PT
VTU|Hermanos Ameijeiras|Las Tunas|CU
VUP|Alfonso López Pumarejo|Valledupar|CO
VUS|Velikiy Ustyug|Velikiy Ustyug|RU
VVC|Vanguardia|Villavicencio|CO
VVZ|Illizi Takhamalt|Illizi|DZ
VXC|Lichinga|Lichinga|MZ
VXO|Växjö Kronoberg|Växjö|SE
VYI|Vilyuisk|Vilyuisk|RU
WAE|Wadi Al Dawasir Domestic|Wadi Al Dawasir|SA
WAG|Wanganui|Wanganui|NZ
WBM|Wapenamanda|Wapenamanda|PG
WDS|Shiyan Wudangshan|Shiyan|CN
WEF|Weifang Nanyuan|Weifang|CN
WEH|Weihai Dashuibo|Weihai|CN
WEI|Weipa|Weipa|AU
WGA|Wagga Wagga|Forest Hill|AU
WGE|Walgett||AU
WGN|Shaoyang Wugang|Shaoyang|CN
WHA|Wuhu Xuanzhou|Wuhu|CN
WHK|Whakatāne|Whakatāne|NZ
WIC|Wick John O'Groats|Wick|GB
WIL|Nairobi Wilson|Nairobi|KE
WIN|Winton||AU
WJR|Wajir|Wajir|KE
WJU|Wonju Airport / Hoengseong Air Base (K-38/K-46)|Wonju|KR
WKA|Wanaka|Wanaka|NZ
WKJ|Wakkanai|Wakkanai|JP
WKK|Aleknagik / New|Aleknagik|US
WMN|Maroantsetra|Maroantsetra|MG
WMT|Zunyi Maotai|Zunyi|CN
WMX|Wamena|Wamena|ID
WNI|Matahora|Wangi-wangi Island|ID
WNP|Naga|Naga|PH
WNR|Windorah|Windorah|AU
WNS|Shaheed Benazirabad|Nawabashah|PK
WOS|Wonsan Kalma|Wonsan|KP
WRE|Whangarei|Whangarei|NZ
WRG|Wrangell|Wrangell|US
WST|Westerly State|Westerly|US
WSZ|Westport|Westport|NZ
WUA|Wuhai|Wuhai|CN
WUN|Wiluna||AU
WUS|Nanping Wuyishan|Wuyishan|CN
WUU|Wau|Wau|SS
WUZ|Wuzhou Xijiang|Tangbu|CN
WWK|Wewak|Wewak|PG
WYA|Whyalla|Whyalla|AU
WYS|Yellowstone|West Yellowstone|US
XAI|Xinyang Minggang|Xinyang|CN
XAP|Serafin Enoss Bertaso|Chapecó|BR
XCH|Christmas Island|Flying Fish Cove|CX
XCR|Chalons Vatry airport|Chalons en Champagne|FR
XFN|Xiangyang Liuji|Xiangyang|CN
XIC|Xichang Qingshan|Liangshan|CN
XIL|Xilinhot|Xilinhot|CN
XKS|Kasabonika|Kasabonika|CA
XMH|Manihi||PF
XMS|Coronel E Carvajal|Macas|EC
XNA|Northwest Arkansas National|Fayetteville/Springdale/Rogers|US
XQP|Quepos Managua|Quepos|CR
XQU|Qualicum Beach|Qualicum Beach|CA
XRY|Jerez|Jerez de la Frontera|ES
XSC|South Caicos|South Caicos|TC
XSP|Seletar|Seletar|SG
XTG|Thargomindah|Thargomindah|AU
XUZ|Xuzhou Guanyin|Xuzhou|CN
XWA|Williston Basin|Williston|US
YAA|Anahim Lake|Anahim Lake|CA
YAG|Fort Frances Municipal|Fort Frances|CA
YAK|Yakutat|Yakutat|US
YAM|Sault Ste Marie|Sault Ste Marie|CA
YAY|St. Anthony|St. Anthony|CA
YAZ|Tofino / Long Beach|Tofino|CA
YBC|Baie-Comeau|Baie-Comeau|CA
YBG|Saguenay-Bagotville|Saguenay|CA
YBK|Baker Lake|Baker Lake|CA
YBL|Campbell River|Campbell River|CA
YBP|Yibin Wuliangye|Yibin|CN
YBR|Brandon Municipal|Brandon|CA
YBX|Lourdes-de-Blanc-Sablon|Blanc-Sablon|CA
YBY|Bonnyville|Bonnyville|CA
YCB|Cambridge Bay|Cambridge Bay|CA
YCD|Nanaimo|Nanaimo|CA
YCG|Castlegar/West Kootenay Regional|Castlegar|CA
YCL|Charlo|Charlo|CA
YCM|Niagara District|Niagara-on-the-Lake|CA
YDA|Dawson City|Dawson City|CA
YDF|Deer Lake|Deer Lake|CA
YDN|Dauphin Barker|Dauphin|CA
YEI|Bursa Yenişehir|Yenişehir|TR
YEV|Inuvik Mike Zubko|Inuvik|CA
YFB|Iqaluit|Iqaluit|CA
YFC|Fredericton|Fredericton|CA
YFS|Fort Simpson|Fort Simpson|CA
YGJ|Yonago Kitaro Airport / JASDF Miho Air Base|Yonago|JP
YGL|La Grande Rivière|La Grande Rivière|CA
YGP|Michel-Pouliot Gaspé|Gaspé|CA
YGR|Îles-de-la-Madeleine|Les Îles-de-la-Madeleine|CA
YGV|Havre-Saint-Pierre|Havre-Saint-Pierre|CA
YGW|Kuujjuarapik|Kuujjuarapik|CA
YHM|John C. Munro Hamilton|Hamilton|CA
YHU|Montréal / Saint-Hubert Metropolitan|Montréal|CA
YHY|Hay River / Merlyn Carter|Hay River|CA
YIC|Yichun Mingyueshan|Yichun|CN
YIE|Arxan Yi'ershi|Arxan|CN
YIF|St Augustin|St-Augustin|CA
YIH|Yichang Sanxia|Yichang|CN
YIN|Ili Yining|Ili|CN
YIV|Island Lake|Island Lake|CA
YJT|Stephenville Dymond|Stephenville|CA
YKA|Kamloops John Moose Fulton Field Regional|Kamloops|CA
YKF|Region of Waterloo|Breslau|CA
YKH|Yingkou Lanqi|Yingkou|CN
YKL|Schefferville|Schefferville|CA
YKM|Yakima Air Terminal McAllister Field|Yakima|US
YKO|Hakkari Yüksekova|Hakkari|TR
YLK|Barrie-Lake Simcoe Regional|Barrie|CA
YLL|Lloydminster|Lloydminster|CA
YLX|Yulin Fumian|Yulin|CN
YMM|Fort McMurray|Fort McMurray|CA
YMO|Moosonee|Moosonee|CA
YMS|Moises Benzaquen Rengifo|Yurimaguas|PE
YMT|Chapais|Chibougamau|CA
YMX|Montreal Mirabel|Montréal|CA
YNA|Natashquan|Natashquan|CA
YND|Ottawa / Gatineau|Gatineau|CA
YNJ|Yanji Chaoyangchuan|Yanji|CN
YNL|Points North Landing|Points North Landing|CA
YOJ|High Level|High Level|CA
YOL|Yola|Yola|NG
YPA|Prince Albert Glass Field|Prince Albert|CA
YPE|Peace River|Peace River|CA
YPL|Pickle Lake|Pickle Lake|CA
YPN|Port-Menier|Port-Menier|CA
YPQ|Peterborough Regional|Peterborough|CA
YPR|Prince Rupert|Prince Rupert|CA
YPW|Powell River|Powell River|CA
YPX|Puvirnituq|Puvirnituq|CA
YPY|Fort Chipewyan|Fort Chipewyan|CA
YPZ|Burns Lake|Burns Lake|CA
YQA|Muskoka|Gravenhurst|CA
YQD|The Pas|The Pas|CA
YQG|Windsor|Windsor|CA
YQH|Watson Lake|Watson Lake|CA
YQK|Kenora|Kenora|CA
YQL|Lethbridge County|Lethbridge|CA
YQM|Greater Moncton Roméo LeBlanc|Moncton|CA
YQN|Nakina|Nakina|CA
YQQ|Comox Valley International Airport / CFB Comox|Comox|CA
YQR|Regina|Regina|CA
YQT|Thunder Bay|Thunder Bay|CA
YQU|Grande Prairie|Grande Prairie|CA
YQX|Gander|Gander|CA
YQY|Sydney / J.A. Douglas McCurdy|Sydney|CA
YQZ|Quesnel|Quesnel|CA
YRB|Resolute Bay|Resolute Bay|CA
YRJ|Roberval|Roberval|CA
YRL|Red Lake|Red Lake|CA
YRO|Ottawa / Rockcliffe|Ottawa|CA
YRT|Rankin Inlet|Rankin Inlet|CA
YSB|Sudbury|Sudbury|CA
YSF|Stony Rapids|Stony Rapids|CA
YSJ|Saint John|Saint John|CA
YSL|Saint-Léonard|Saint-Léonard|CA
YSM|Fort Smith|Fort Smith|CA
YSQ|Songyuan Chaganhu|Qian Gorlos Mongol Autonomous County|CN
YTH|Thompson|Thompson|CA
YTS|Timmins/Victor M. Power|Timmins|CA
YTY|Yangzhou Taizhou|Yangzhou|CN
YTZ|Billy Bishop Toronto City|Toronto|CA
YUM|Yuma International Airport / Marine Corps Air Station Yuma|Yuma|US
YUS|Yushu Batang|Yushu|CN
YUX|Hall Beach|Sanirajak|CA
YUY|Rouyn Noranda|Rouyn-Noranda|CA
YVB|Bonaventure|Bonaventure|CA
YVC|La Ronge|La Ronge|CA
YVO|Val-d'Or|Val-d'Or|CA
YVP|Kuujjuaq|Kuujjuaq|CA
YVQ|Norman Wells|Norman Wells|CA
YVV|Wiarton|Wiarton|CA
YWK|Wabush|Wabush|CA
YWL|Williams Lake|Williams Lake|CA
YXC|Cranbrook/Canadian Rockies|Cranbrook|CA
YXH|Medicine Hat Regional|Medicine Hat|CA
YXJ|Fort St John / North Peace Regional|Fort Saint John|CA
YXK|Rimouski|Rimouski|CA
YXL|Sioux Lookout|Sioux Lookout|CA
YXS|Prince George (International)|Prince George|CA
YXT|Northwest Regional Airport Terrace-Kitimat|Terrace|CA
YXU|London|London|CA
YXX|Abbotsford|Abbotsford|CA
YXY|Whitehorse / Erik Nielsen|Whitehorse|CA
YYA|Yueyang Sanhe|Yueyang|CN
YYB|North Bay Jack Garland|North Bay|CA
YYD|Smithers|Smithers|CA
YYE|Fort Nelson|Fort Nelson|CA
YYF|Penticton|Penticton|CA
YYG|Charlottetown|Charlottetown|CA
YYL|Lynn Lake|Lynn Lake|CA
YYQ|Churchill|Churchill|CA
YYR|Goose Bay|Goose Bay|CA
YYY|Mont Joli|Mont-Joli|CA
YZF|Yellowknife|Yellowknife|CA
YZP|Sandspit|Sandspit|CA
YZS|Coral Harbour|Coral Harbour|CA
YZT|Port Hardy|Port Hardy|CA
YZU|Whitecourt|Whitecourt|CA
YZV|Sept-Îles|Sept-Îles|CA
YZY|Zhangye Ganzhou|Zhangye|CN
ZAL|Pichoy|Valdivia|CL
ZBF|Bathurst|South Tetagouche|CA
ZBR|Chabahar Konarak|Konarak|IR
ZCL|General Leobardo C. Ruiz|Zacatecas|MX
ZEL|Bella Bella (Campbell Island)|Bella Bella|CA
ZHY|Zhongwei Shapotou|Zhongwei|CN
ZIG|Ziguinchor|Ziguinchor|SN
ZIX|Zhigansk|Zhigansk|RU
ZKP|Zyryanka|Zyryanka|RU
ZLO|Playa de Oro|Manzanillo|MX
ZMT|Masset|Masset|CA
ZND|Zinder|Zinder|NE
ZNE|Newman|Newman|AU
ZOS|Cañal Bajo Carlos Hott Siebert|Osorno|CL
ZQZ|Zhangjiakou Ningyuan|Zhangjiakou|CN
ZSJ|Sandy Lake|Sandy Lake|CA
ZTH|Zakynthos International Airport Dionysios Solomos|Zakynthos|GR
ZYI|Zunyi Xinzhou|Zunyi|CN
AAK|Aranuka|Buariki|KI
AAZ|Quezaltenango|Quezaltenango|GT
ABM|Northern Peninsula|Bamaga|AU
ABU|AA Bere Tallo (Haliwen)|Atambua|ID
ACF|Aral Tarim|Aral|CN
AET|Allakaket|Allakaket|US
AGE|Wangerooge|Wangerooge|DE
AGI|Wageningen Airstrip|Wageningen|SR
AGJ|Aguni|Aguni|JP
AIP|Adampur|Adampur|IN
AIT|Aitutaki|Aitutaki|CK
AIU|Enua|Atiu Island|CK
AKA|Ankang Fuqiang|Ankang|CN
AKB|Atka|Atka|US
AKI|Akiak|Akiak|US
AKK|Akhiok|Akhiok|US
AKS|Gwaunaru'u|Auki|SB
AKV|Akulivik|Akulivik|CA
ANS|Andahuaylas|Andahuaylas|PE
APK|Apataki|Apataki|PF
ARD|Alor Island - Mali|Kabola|ID
ATT|Atmautluak|Atmautluak|US
AUK|Alakanuk|Alakanuk|US
AUL|Aur Island|Aur Atoll|MH
AUU|Aurukun|Aurukun|AU
BAS|Ballalae|Ballalae|SB
BAZ|Barcelos|Barcelos|BR
BBG|Butaritari|Butaritari|KI
BBR|Basse-Terre Baillif|Basse-Terre|GP
BDD|Badu Island|Badu Island|AU
BDP|Bhadrapur|Bhadrapur|NP
BFQ|Bahia Piña|Puerto Piña|PA
BGG|Bingöl|Bingöl|TR
BGK|Big Creek|Big Creek|BZ
BHR|Bharatpur|Bharatpur|NP
BID|Block Island State|Block Island|US
BKC|Buckland|Buckland|US
BKM|Bakalalan|Bakalalan|MY
BKZ|Bukoba|Bukoba|TZ
BLB|Panamá Pacífico|Panamá City|PA
BLW|Beledweyne|Beledweyne|SO
BMK|Borkum|Borkum|DE
BMO|Banmaw|Banmaw|MM
BMR|Baltrum|Baltrum|DE
BMY|Île Art - Waala|Waala|NC
BNB|Boende|Boende|CD
BNY|Bellona/Anua|Anua|SB
BOT|Bosset|Bosset|PG
BQB|Busselton Margaret River Regional|Busselton|AU
BQG|Bogorodskoye|Bogorodskoye|RU
BQJ|Batagay|Batagay|RU
BRA|Dom Ricardo Weberberger|Barreiras|BR
BSX|Pathein|Pathein|MM
BTT|Bettles|Bettles|US
BTW|Bersujud|Batu Licin|ID
BUC|Burketown||AU
BUI|Bokondini|Bokondini|ID
BUT|Bathpalathang|Jakar|BT
BUU|Muara Bungo|Muara Bungo|ID
BVS|Breves|Breves|BR
BWX|Banyuwangi|Rogojampi, Banyuwangi|ID
BXG|Bendigo||AU
BXT|LNG Badak|Bontang-Borneo Island|ID
BYO|Bonito|Bonito|BR
BYR|Læsø|Læsø|DK
BYW|Blakely Island|Blakely Island|US
CAF|Carauari|Carauari|BR
CAU|Caruaru|Caruaru|BR
CCA|Chimore|Chimore|BO
CCV|Craig Cove|Craig Cove|VU
CEL|Canela|Canela|BR
CEM|Central|Central|US
CFB|Cabo Frio|Cabo Frio|BR
CHU|Chuathbaluk|Chuathbaluk|US
CHY|Choiseul Bay|Choiseul Bay|SB
CIH|Changzhi Wangcun|Changzhi|CN
CIK|Chalkyitsik|Chalkyitsik|US
CJN|Nusawiru|Cijulang|ID
CJZ|Pedro Vieira Moreira|Cajazeiras|BR
CKD|Crooked Creek|Crooked Creek|US
CKW|Christmas Creek|Christmas Creek Mine|AU
CKX|Chicken|Chicken|US
CLP|Clarks Point|Clarks Point|US
CLV|Nelson Ribeiro Guimarães|Caldas Novas|BR
CNC|Coconut Island||AU
CNI|Changhai Dachangshandao|Dalian|CN
COL|Coll|Coll Island|GB
CRU|Lauriston|Carriacou Island|GD
CSA|Colonsay Airstrip|Colonsay|GB
CSH|Solovki|Solovetsky Islands|RU
CUA|Ciudad Constitución National|Comondú|MX
CVU|Corvo|Corvo|PT
CWS|Center Island|Center Island|US
CYF|Chefornak|Chefornak|US
CYT|Yakataga|Yakataga|US
CYU|Cuyo|Cuyo|PH
DAX|Dachuan|Dazhou|CN
DBA|Dalbandin|Dalbandin|PK
DEE|Yuzhno-Kurilsk Mendeleyevo|Yuzhno-Kurilsk|RU
DEM|Dembidollo|Dembidollo|ET
DEX|Nop Goliat Dekai|Dekai|ID
DGH|Deoghar|Deoghar|IN
DIU|Diu|Diu|IN
DJB|Sultan Thaha|Jambi|ID
DLR|Dalnerechensk|Dalnerechensk|RU
DMD|Doomadgee||AU
DOP|Dolpa|Dolpa|NP
DPT|Deputatskiy|Deputatskiy|RU
DQA|Daqing Sartu|Daqing|CN
DRJ|Drietabbetje|Drietabbetje|SR
DRV|Dharavandhoo|Baa Atoll|MV
DSD|La Désirade|Grande Anse|GP
DSE|Kombolcha|Dessie|ET
DTB|Silangit|Siborong-Borong|ID
DTD|Datadawai|Datadawai-Borneo Island|ID
DTR|Decatur Shores|Decatur|US
DWB|Soalala|Soalala|MG
DXJ|Xiangxi Biancheng|Xiangxi|CN
EAA|Eagle|Eagle|US
EAX|Eduard Alexander Gummels|Kwatta|SR
EDR|Pormpuraaw|Pormpuraaw|AU
EEK|Eek|Eek|US
EJT|Enejit|Enejit Island|MH
EKS|Shakhtyorsk|Shakhtyorsk|RU
ELI|Elim|Elim|US
EME|Emden|Emden|DE
ENE|H. Hasan Aroeboesman (Ende)|Ende|ID
ENI|El Nido|El Nido|PH
ENT|Eniwetok|Eniwetok Atoll|MH
EUA|Kaufana|Eua Island|TO
EVG|Sveg|Sveg|SE
FBD|Fayzabad|Fayzabad|AF
FBE|Paulo Abdala|Francisco Beltrão|BR
FDE|Førde Airport, Bringeland|Førde|NO
FHZ|Fakahina|Fakahina|PF
FIE|Fair Isle|Fair Isle|GB
FLS|Flinders Island|Whitemark|AU
FMT|Faresmaathoda|Faresmaathodaa|MV
FND|Funadhoo|Funadhoo|MV
FOA|Foula|Foula|GB
FRE|Fera/Maringe|Fera Island|SB
FSH|Syekh Hamzah Fansyuri|Singkil|ID
FTA|Futuna|Futuna Island|VU
FTI|Fitiuta|Fitiuta Village|AS
FUT|Pointe Vele|Futuna Island|WF
GAX|Gamba|Gamba|GA
GBI|Kalaburagi|Kalaburagi|IN
GBZ|Great Barrier Aerodrome|Claris|NZ
GGF|Almeirim|Almeirim|BR
GGJ|Guaíra|Guaíra|BR
GGR|Garowe|Garowe|SO
GGS|Gobernador Gregores|Gobernador Gregores|AR
GIC|Boigu Island|Boigu Island|AU
GKK|Kooddoo|Huvadhu Atoll|MV
GLK|Galcaio|Galcaio|SO
GLV|Golovin|Golovin|US
GMI|Gasmata Island|Gasmata Island|PG
GMZ|La Gomera|Alajero, La Gomera Island|ES
GNU|Goodnews|Goodnews|US
GOY|Tura Mountain|Tura|RU
GTA|Gatokae Aerodrome|Gatokae|SB
GTO|Jalaluddin|Gorontalo|ID
GUB|Guerrero Negro|San Quintín|MX
GUZ|Guarapari|Guarapari|BR
GYZ|Gruyere|Cosmo Newbery|AU
GZG|Garze Gesar|Garzê|CN
GZO|Nusatupe|Gizo|SB
HAA|Hasvik|Hasvik|NO
HAL|Halali|Halali|NA
HBQ|Haibei Qilian|Haibei|CN
HDD|Hyderabad|Hyderabad|PK
HDK|Kulhudhuffushi|Kulhudhuffushi|MV
HDO|Hindon Airport / Hindon Air Force Station|Ghaziabad|IN
HEI|Heide-Büsum|Oesterdeichstrich|DE
HFS|Hagfors|Råda|SE
HGD|Hughenden|Hughenden|AU
HGL|Helgoland-Düne|Helgoland|DE
HHZ|Hikueru|Hikueru|PF
HIL|Shilavo|Shilavo|ET
HJB|Hejing Bayinbuluke|Hejing|CN
HLH|Ulanhot Yilelite|Ulanhot|CN
HMS|Haji Muhammad Sidik|Muara Teweh|ID
HMV|Hemavan|Hemavan|SE
HNH|Hoonah|Hoonah|US
HNY|Hengyang Nanyue|Hengyang|CN
HOK|Hooker Creek|Lajamanu|AU
HPB|Hooper Bay|Hooper Bay|US
HQQ|Anyang Hongqiqu|Anyang|CN
HRF|Hoarafushi||MV
HRH|Aligarh|Aligarh|IN
HUG|Huehuetenango|Huehuetenango|GT
HUS|Hughes|Hughes|US
IAO|Siargao|Del Carmen|PH
IBB|General Villamil|Puerto Villamil|EC
ICC|Andrés Miguel Salazar Marcano|Isla de Coche|VE
ICI|Cicia|Cicia|FJ
IGG|Igiugig|Igiugig|US
IIA|Inishmaan Aerodrome|Inis Meáin|IE
IKO|Nikolski Air Station|Nikolski|US
ILF|Ilford|Ilford|CA
IMK|Simikot|Simikot|NP
INB|Independence|Independence|BZ
INO|Inongo|Inongo|CD
INQ|Inisheer Aerodrome|Inis Oírr|IE
IOR|Inishmore Aerodrome|Inis Mór|IE
IRA|Ngorangora|Kirakira|SB
IRC|Circle City (New)|Circle|US
IRZ|Tapuruquara|Santa Isabel do Rio Negro|BR
ISC|St. Mary's|St. Mary's, Isles of Scilly|GB
ITU|Iturup|Kurilsk|RU
IWD|Gogebic Iron County|Ironwood|US
JBB|Notohadinegoro|Jember|ID
JBK|Qitai Jiangbulake|Qitai|CN
JCK|Julia Creek||AU
JDO|Orlando Bezerra de Menezes|Juazeiro do Norte|BR
JEJ|Jeh|Ailinglapalap Atoll|MH
JFR|Paamiut|Paamiut|GL
JGB|Jagdalpur|Jagdalpur|IN
JIK|Ikaria|Ikaria Island|GR
JIO|Jos Orno Imsula|Tiakur|ID
JIU|Jiujiang Lushan|Jiujiang|CN
JJG|Humberto Ghizzo Bortoluzzi Regional|Jaguaruna|BR
JJM|Mulika Lodge|Meru-Kinna|KE
JKL|Kalymnos|Kalymnos Island|GR
JLG|Jalgaon|Jalgaon|IN
JMO|Jomsom|Jomsom|NP
JNX|Naxos Island National|Naxos|GR
JPE|Nagib Demachki|Paragominas|BR
JPR|Ji-Paraná|Ji-Paraná|BR
JQA|Qaarsut|Uummannaq|GL
JRG|Jharsuguda||IN
JSK|Jask|Bandar-e-Jask|IR
JSU|Maniitsoq|Maniitsoq|GL
JSY|Syros|Syros Island|GR
JTY|Astypalaia|Astypalaia Island|GR
JUH|Chizhou Jiuhuashan|Chizhou|CN
JUI|Juist|Juist|DE
JUM|Jumla|Jumla|NP
JUV|Upernavik|Upernavik|GL
KAA|Kasama|Kasama|ZM
KAL|Kaltag|Kaltag|US
KAX|Kalbarri|Kalbarri|AU
KBC|Birch Creek|Birch Creek|US
KBU|Gusti Syamsir Alam|Stagen|ID
KCA|Kuqa Qiuci|Kuqa|CN
KCG|Chignik|Chignik|US
KCQ|Chignik Lake|Chignik Lake|US
KDD|Khuzdar|Khuzdar|PK
KDI|Haluoleo|Kendari|ID
KDV|Vunisea|Vunisea|FJ
KEB|Nanwalek|Nanwalek|US
KEW|Keewaywin|Keewaywin|CA
KFG|Kalkgurung||AU
KFP|False Pass|False Pass|US
KGE|Kaghau|Kagau Island|SB
KGK|Koliganek|Koliganek|US
KGX|Grayling|Grayling|US
KHM|Kanti|Kanti|MM
KHZ|Kauehi|Kauehi|PF
KIE|Aropa|Kieta|PG
KIF|Kingfisher Lake|Kingfisher Lake|CA
KIO|Kili|Kili Island|MH
KIT|Kithira|Kithira Island|GR
KKA|Koyuk Alfred Adams|Koyuk|US
KKH|Kongiganak|Kongiganak|US
KKI|Akiachak|Akiachak|US
KLG|Kalskag|Kalskag|US
KLN|Larsen Bay|Larsen Bay|US
KLP|Seruyan Kuala Pembuang|Seruyan|ID
KMN|Kamina City|Kamina|CD
KMO|Manokotak|Manokotak|US
KNK|Kokhanok|Kokhanok|US
KNW|New Stuyahok|New Stuyahok|US
KOC|Koumac|Koumac|NC
KOT|Kotlik|Kotlik|US
KOW|Ganzhou Huangjin|Ganzhou|CN
KOZ|Ouzinkie|Ouzinkie|US
KPN|Kipnuk|Kipnuk|US
KPV|Perryville|Perryville|US
KQA|Akutan|Akutan|US
KQR|Karara|Karara|AU
KRB|Karumba||AU
KRC|Departi Parbo|Sungai Penuh|ID
KRE|Kirundo|Kirundo|BI
KRI|Kikori|Kikori|PG
KRY|Karamay|Karamay|CN
KSJ|Kasos|Kasos Island|GR
KSM|St Mary's|St Mary's|US
KSO|Kastoria National Airport Aristotle|Argos Orestiko|GR
KSQ|Karshi|Karshi|UZ
KSR|Selayar - Haji Aroeppala|Benteng|ID
KTS|Brevig Mission|Brevig Mission|US
KUD|Kudat|Kudat|MY
KUG|Kubin Island|Kubin Island|AU
KUK|Kasigluk|Kasigluk|US
KVC|King Cove|King Cove|US
KVL|Kivalina|Kivalina|US
KVM|Markovo|Markovo|RU
KWB|Dewadaru|Karimunjawa|ID
KWK|Kwigillingok|Kwigillingok|US
KWN|Quinhagak|Quinhagak|US
KWT|Kwethluk|Kwethluk|US
KXF|Koro Island|Koro Island|FJ
KXO|Kisoro|Kisoro|UG
KYK|Karluk|Karluk|US
KYU|Koyukuk|Koyukuk|US
KZR|Zafer|Altıntaş|TR
KZS|Kastelorizo|Kastelorizo Island|GR
LAK|Aklavik/Freddie Carmichael|Aklavik|CA
LBJ|Komodo|Labuan Bajo, Manggarai Barat|ID
LBP|Long Banga|Long Banga|MY
LBR|Lábrea|Lábrea|BR
LBW|Yuvai Semaring|Long Bawan|ID
LCR|Virgilio Barco Vargas (La Chorrera)|La Chorrera|CO
LDG|Leshukonskoye|Leshukonskoye|RU
LDH|Lord Howe Island|Lord Howe Island|AU
LEC|Coronel Horácio de Mattos|Lençóis|BR
LEL|Lake Evella||AU
LEQ|Land's End|Land's End, Cornwall|GB
LEV|Levuka|Bureta|FJ
LGL|Long Lellang|Long Datih|MY
LGZ|Shannan Longzi|Shannan|CN
LIK|Likiep|Likiep Island|MH
LKA|Larantuka Gewayentana|Tiwatobi|ID
LKB|Lakeba Island|Lakeba Island|FJ
LKI|Lasikin|Lubang|ID
LKM|Bolaang Mongondow|Lolak|ID
LLB|Libo|Qiannan|CN
LLK|Lankaran|Lankaran|AZ
LLO|Bua - Palopo Lagaligo|Palopo|ID
LMA|Minchumina|Minchumina|US
LMC|La Macarena|La Macarena|CO
LMY|Lake Murray|Lake Murray|PG
LNB|Lamen Bay|Lamen Bay|VU
LNE|Lonorore|Lonorore|VU
LNU|Robert Atty Bessing|Malinau|ID
LNV|Londolovit|Londolovit|PG
LOD|Longana|Longana|VU
LOH|Ciudad de Catamayo|La Toma|EC
LPD|La Pedrera|La Pedrera|CO
LPM|Lamap|Lamap|VU
LPS|Lopez Island|Lopez|US
LPU|Long Apung|Long Apung-Borneo Island|ID
LPY|Le Puy-Loudes|Chaspuzac, Haute-Loire|FR
LQM|Caucaya|Puerto Leguízamo|CO
LRS|Leros|Leros Island|GR
LRV|Los Roques|Gran Roque Island|VE
LSA|Losuia|Losuia|PG
LSW|Malikus Saleh|Lhok Seumawe-Sumatra Island|ID
LTT|La Môle|Saint-Tropez|FR
LUP|Kalaupapa|Kalaupapa|US
LVO|Laverton|Laverton|AU
LWK|Lerwick / Tingwall|Lerwick, Shetland Islands|GB
LWY|Lawas|Lawas|MY
LXG|Luang Namtha|Luang Namtha|LA
LXS|Limnos|Limnos Island|GR
MBL|Manistee County Blacker|Manistee|US
MCV|McArthur River Mine|McArthur River Mine|AU
MFA|Mafia|Kilindoni|TZ
MFG|Muzaffarabad|Muzaffarabad|PK
MFJ|Moala|Moala|FJ
MGT|Milingimbi|Milingimbi Island|AU
MHC|Mocopulli|Dalcahue|CL
MHM|Manaoba|Manaoba|SB
MHX|Manihiki Island|Manihiki Island|CK
MIJ|Mili Island|Mili Island|MH
MIS|Misima Island|Misima Island|PG
MJE|Majkin|Majkin|MH
MJY|Motygino|Motygino|RU
MLL|Marshall Don Hunter Sr|Marshall|US
MLO|Milos|Milos Island|GR
MLY|Manley Hot Springs|Manley Hot Springs|US
MNF|Mana Island|Mana Island|FJ
MNT|Minto Al Wright|Minto|US
MNU|Mawlamyine|Mawlamyine|MM
MNY|Mono|Stirling Island|SB
MOF|Frans Xavier Seda|Waioti|ID
MOH|Maleo|Morowali|ID
MOI|Mitiaro Island|Mitiaro Island|CK
MOJ|Moengo Airstrip|Moengo|SR
MOU|Mountain Village|Mountain Village|US
MPC|Muko Muko|Muko Muko|ID
MQC|Miquelon|Miquelon|PM
MRA|Misrata|Misrata|LY
MSA|Muskrat Dam|Muskrat Dam|CA
MTF|Mizan Teferi|Mizan Teferi|ET
MTP|Montauk|Montauk|US
MUK|Mauke|Mauke Island|CK
MUZ|Musoma|Musoma|TZ
MVY|Martha's Vineyard|Martha's Vineyard|US
MWQ|Magway|Magway|MM
MXH|Moro|Moro|PG
MXW|Mandalgobi|Mandalgobi|MN
MXZ|Meizhou Meixian Changgangji|Meizhou|CN
MYI|Murray Island|Murray Island|AU
MYK|May Creek|May Creek|US
MZH|Amasya Merzifon|Amasya|TR
NAO|Nanchong Gaoping|Nanchong|CN
NAU|Napuka Island|Napuka Island|PF
NBN|Annobón|San Antonio de Palé|GQ
NCN|Chenega Bay|Chenega|US
NDY|Sanday|Sanday|GB
NGI|Ngau|Ngau|FJ
NGK|Nogliki|Nogliki|RU
NIB|Nikolai|Nikolai|US
NIU|Naiu|Naiu Atoll|PF
NLF|Darnley Island|Darnley Island|AU
NLG|Nelson Lagoon|Nelson Lagoon|US
NME|Nightmute|Nightmute|US
NNB|Santa Ana|Santa Ana Island|SB
NNR|Connemara Regional|Inverin|IE
NNY|Nanyang Jiangying|Nanyang|CN
NOD|Norden-Norddeich|Norddeich|DE
NQU|Reyes Murillo|Nuquí|CO
NRD|Norderney|Norderney|DE
NRL|North Ronaldsay|North Ronaldsay|GB
NTT|Kuini Lavenia|Niuatoputapu|TO
NUL|Nulato|Nulato|US
NUP|Nunapitchuk|Nunapitchuk|US
NUS|Norsup|Norsup|VU
NYU|Bagan|Nyaung U|MM
NZG|Nizhneangarsk|Nizhneangarsk|RU
OAL|Cacoal|Cacoal|BR
OBN|Oban|North Connel|GB
OBU|Kobuk|Kobuk|US
OBX|Obo|Obo|PG
ODN|Long Seridan|Long Seridan|MY
ODO|Bodaybo|Bodaybo|RU
ODY|Oudomsay|Oudomsay|LA
OES|Antoine de Saint Exupéry|San Antonio Oeste|AR
OFU|Ofu|Ofu|AS
OJU|Tanjung Api|Tojo Una-Una|ID
OKR|Yorke Island|Yorke Island|AU
OLH|Old Harbor|Old Harbor|US
OLJ|North West Santo|Olpoi|VU
OLP|Olympic Dam|Olympic Dam|AU
ONG|Mornington Island||AU
OOK|Toksook Bay|Toksook Bay|US
OPP|Salinópolis|Salinópolis|BR
OPS|Presidente João Batista Figueiredo|Sinop|BR
ORG|Zorg en Hoop|Paramaribo|SR
ORI|Port Lions|Port Lions|US
ORV|Robert (Bob) Curtis Memorial|Noorvik|US
ORZ|H.E Alfredo Martinez (Tower Hill) Airstrip|Orange Walk|BZ
OSY|Namsos|Namsos|NO
OTD|Raul Arias Espinoza|Contadora Island|PA
OTS|Anacortes|Anacortes|US
OUI|Ouessant|Ushant|FR
PAS|Paros National|Paros|GR
PBJ|Tavie|Paama Island|VU
PCN|Picton Aerodrome|Koromiko|NZ
PDB|Pedro Bay|Pedro Bay|US
PDM|Capt. J. Montenegro|Pedasí|PA
PEU|Puerto Lempira|Puerto Lempira|HN
PFQ|Parsabad-Moghan|Parsabad|IR
PFR|Ilebo|Ilebo|CD
PGM|Port Graham|Port Graham|US
PHO|Point Hope|Point Hope|US
PIP|Pilot Point|Pilot Point|US
PJA|Pajala|Pajala|SE
PKA|Napaskiak|Napaskiak|US
PKG|Pulau Pangkor|Pangkor Island|MY
PKN|Iskandar|Pangkalanbun|ID
PKP|Puka Puka||PF
PMK|Palm Island||AU
PND|Punta Gorda|Punta Gorda|BZ
PPE|Mar de Cortés|Puerto Peñasco|MX
PPW|Papa Westray|Papa Westray, Orkney Islands|GB
PQS|Pilot Station|Pilot Station|US
PSY|Port Stanley|Stanley|FK
PTA|Port Alsworth|Port Alsworth|US
PTF|Malolo Lailai Island|Malolo Lailai Island|FJ
PTO|Juvenal Loureiro Cardoso|Pato Branco|BR
PUR|Puerto Rico|Puerto Rico/Manuripi|BO
PXH|Prominent Hill|Mount Eba|AU
PYT|Pedro Rabelo de Souza|Paracatu|BR
RAM|Ramingining||AU
RBB|Borba|Borba|BR
RBQ|Rurrenabaque|Rurrenabaque|BO
RBV|Ramata|Ramata|SB
RCE|Roche Harbor|Roche Harbor|US
RCM|Richmond||AU
RDV|Red Devil|Red Devil|US
RET|Røst|Røst|NO
RHT|Alxa Right Banner Badanjilin|Badanjilin|CN
RIH|Scarlett Martinez|Río Hato|PA
RJM|Marinda|Waisai|ID
RKI|Mentawai|Sipura Island|ID
RMP|Rampart|Rampart|US
RMT|Rimatara|Rimatara Island|PF
RNI|Corn Island|Corn Island|NI
RNL|Rennell/Tingoa|Rennell Island|SB
RNP|Rongelap Island|Rongelap Island|MH
RRR|Raroia|Raroia|PF
RSH|Russian Mission|Russian Mission|US
RTA|Rotuma|Rotuma|FJ
RTG|Frans Sales Lega|Satar Tacik, Manggarai|ID
RTI|David Constantijn Saudale|Ba'a - Rote Island|ID
RUL|Maavaarulaa|Maavaarulu|MV
RUS|Marau|Marau|SB
RVE|Los Colonizadores|Saravena|CO
RVV|Raivavae||PF
RYO|28 de Noviembre|Rio Turbio|AR
SBR|Saibai Island|Saibai Island|AU
SCM|Scammon Bay|Scammon Bay|US
SCY|San Cristóbal|Puerto Baquerizo Moreno|EC
SCZ|Santa Cruz/Graciosa Bay/Luova|Santa Cruz/Graciosa Bay/Luova|SB
SDN|Sandane Airport, Anda|Sandane|NO
SET|Santa Magalhães|Serra Talhada|BR
SEU|Seronera|Seronera|TZ
SFC|St-François|St-François|GP
SFL|São Filipe|São Filipe|CV
SGO|St George||AU
SGY|Skagway|Skagway|US
SHC|Shire Inda Selassie|Shire Inda Selassie|ET
SHF|Shihezi Huayuan|Shihezi|CN
SHG|Shungnak|Shungnak|US
SHH|Shishmaref|Shishmaref|US
SHY|Shinyanga|Shinyanga|TZ
SIF|Simara|Simara|NP
SIH|Silgadi Doti|Silgadi Doti|NP
SKH|Surkhet|Surkhet|NP
SKK|Shaktoolik|Shaktoolik|US
SKU|Skiros|Skiros Island|GR
SLH|Sola|Sola|VU
SLI|Solwesi|Solwesi|ZM
SLQ|Sleetmute|Sleetmute|US
SLX|Salt Cay|Salt Cay|TC
SMK|St Michael|St Michael|US
SMQ|Sampit (H.Asan)|Sampit|ID
SMT|Adolino Bedin Regional|Sorriso|BR
SNX|Semnan Municipal|Semnan|IR
SOD|Sorocaba|Sorocaba|BR
SOG|Sogndal Airport, Haukåsen|Sogndal|NO
SOV|Seldovia|Seldovia|US
SOY|Stronsay|Stronsay|GB
SRA|Luis Alberto Lehr|Santa Rosa|BR
SRL|Palo Verde|Mulegé|MX
SRV|Stony River 2|Stony River|US
SSR|Sara|Pentecost Island|VU
SSW|Stuart Island Airpark|Friday Harbor|US
SUK|Sakkyryr|Batagay-Alyta|RU
SUR|Summer Beaver|Summer Beaver|CA
SUY|Suntar|Suntar|RU
SVS|Stevens Village|Stevens Village|US
SVU|Savusavu|Savusavu|FJ
SWL|San Vicente|San Vicente|PH
SWQ|Sultan Muhammad Kaharuddin III|Sumbawa Besar|ID
SWX|Shakawe|Shakawe|BW
SXK|Mathilda Batlayeri|Saumlaki-Yamdena Island|ID
SXP|Nunam Iqua|Nunam Iqua|US
SYM|Pu'er Simao|Pu'er|CN
SYU|Warraber Island|Sue Islet|AU
SZE|Semera|Semera|ET
SZI|Zaysan|Zaysan|KZ
TAL|Ralph M Calhoun Memorial|Tanana|US
TBG|Tabubil|Tabubil|PG
TBM|Tumbang Samba|Tumbang Samba-Borneo Island|ID
TBO|Tabora|Tabora|TZ
TCD|Tarapacá|Tarapacá|CO
TCG|Tacheng Qianquan|Tacheng|CN
TCR|Tuticorin|Vagaikulam|IN
TCT|Takotna|Takotna|US
TDS|Sasereme|Sasereme|PG
TEK|Tatitlek|Tatitlek|US
TFI|Tufi|Tufi|PG
TGH|Tongoa|Tongoa Island|VU
TGQ|Tangará da Serra|Tangará da Serra|BR
THD|Tho Xuan|Thanh Hóa|VN
THO|Þórshöfn|Þórshöfn|IS
THX|Turukhansk|Turukhansk|RU
TIE|Tippi|Tippi|ET
TIZ|Tari|Tari|PG
TJL|Plínio Alarcom|Três Lagoas|BR
TJQ|H A S Hanandjoeddin|Tanjung Pandan|ID
TJS|Tanjung Harapan|Tanjung Selor-Borneo Island|ID
TKJ|Tok Junction|Tok|US
TKM|Taksimo|Taksimo|RU
TKQ|Kigoma|Kigoma|TZ
TKV|Tatakoto|Tatakoto|PF
TLA|Teller|Teller|US
TLI|Sultan Bantilan|Toli Toli-Celebes Island|ID
TLT|Tuluksak|Tuluksak|US
TLU|Golfo de Morrosquillo|Santiago de Tolú|CO
TLY|Plastun|Plastun|RU
TMC|Tambolaka|Radamata|ID
TMF|Thimarafushi|Thimarafushi|MV
TMG|Tomanggong|Tomanggong|MY
TMI|Tumling Tar|Tumling Tar|NP
TNC|Tin City Long Range Radar Station|Tin City|US
TNK|Tununak|Tununak|US
TOG|Togiak|Togiak Village|US
TOW|Toledo - Luiz Dalcanale Filho Municipal|Toledo|BR
TPI|Tapini|Tapini|PG
TTS|Tsaratanana|Tsaratanana|MG
TVS|Tangshan Sannühe|Tangshan|CN
TVU|Matei|Matei|FJ
TWA|Twin Hills|Twin Hills|US
TWC|Tumxuk Tangwangcheng|Tumxuk|CN
UAH|Ua Huka|Ua Huka|PF
UAP|Ua Pou|Ua Pou|PF
UBB|Mabuiag Island|Mabuiag Island|AU
UII|Utila|Utila Island|HN
UIT|Jaluit|Jabor Jaluit Atoll|MH
UJE|Ujae Atoll|Ujae Atoll|MH
UKG|Ust-Kuyga|Ust-Kuyga|RU
ULZ|Donoi|Uliastai|MN
UMS|Ust-Maya|Ust-Maya|RU
UMU|Orlando de Carvalho|Umuarama|BR
UNA|Una-Comandatuba|Una|BR
UNG|Kiunga|Kiunga|PG
UOL|Buol - Pogogul|Buol|ID
USJ|Usharal|Usharal|KZ
UTK|Utirik|Utirik Island|MH
UVI|José Cleto|União da Vitória|BR
UZR|Urzhar|Urzhar|KZ
VAK|Chevak|Chevak|US
VAL|Valença|Valença|BR
VAO|Suavanao|Suavanao|SB
VAS|Sivas Nuri Demirağ|Sivas|TR
VBV|Vanua Balavu|Vanua Balavu|FJ
VCL|Chu Lai|Tam Nghĩa|VN
VEE|Venetie|Venetie|US
VHV|Verkhnevilyuisk|Verkhnevilyuisk|RU
VJB|Xai-Xai Chongoene|Xai-Xai|MZ
VLS|Valesdir|Epi Island|VU
VSV|Shravasti|Shravasti|IN
WAA|Wales|Wales|US
WBB|Stebbins|Stebbins|US
WBQ|Beaver|Beaver|US
WDN|Waldron Airstrip|Eastsound|US
WGP|Umbu Mehang Kunda|Waingapu-Sumba Island|ID
WLH|Walaha|Walaha|VU
WLK|Selawik|Selawik|US
WMO|White Mountain|White Mountain|US
WNA|Napakiak|Napakiak|US
WNH|Wenshan Puzhehei|Wenshan|CN
WNN|Wunnumin Lake|Wunnumin Lake|CA
WRY|Westray|Westray, Orkney Islands|GB
WSK|Chongqing Wushan|Wushan|CN
WSN|South Naknek Number 2|South Naknek|US
WTA|Tambohorano|Tambohorano|MG
WTE|Wotje|Wotje|MH
WTK|Noatak|Noatak|US
WTL|Tuntutuliak|Tuntutuliak|US
WTO|Wotho Island|Wotho Island|MH
WUT|Xinzhou Wutaishan|Xinzhou|CN
WWT|Mertarvik|Mertarvik|US
WXN|Wanzhou Wuqiao|Wanzhou|CN
XBE|Bearskin Lake|Bearskin Lake|CA
XGR|Kangiqsualujjuaq (Georges River)|Kangiqsualujjuaq|CA
XKH|Xieng Khouang|Xieng Khouang|LA
XLB|Lac Brochet|Lac Brochet|CA
XMY|Yam Island|Yam Island|AU
XPK|Pukatawagan|Pukatawagan|CA
XSI|South Indian Lake|South Indian Lake|CA
XTL|Tadoule Lake|Tadoule Lake|CA
XYA|Yandina|Yandina|SB
YAB|Arctic Bay|Arctic Bay|CA
YAC|Cat Lake|Cat Lake|CA
YAL|Alert Bay|Alert Bay|CA
YAS|Yasawa Island|Yasawa Island|FJ
YAT|Attawapiskat|Attawapiskat|CA
YAX|Wapekeka|Angling Lake|CA
YBB|Kugaaruk|Kugaaruk|CA
YBE|Uranium City|Uranium City|CA
YBI|Black Tickle|Black Tickle|CA
YBT|Brochet|Brochet|CA
YBV|Berens River|Berens River|CA
YCK|Tommy Kochon|Colville Lake|CA
YCO|Kugluktuk|Kugluktuk|CA
YCR|Cross Lake (Charlie Sinclair Memorial)|Cross Lake|CA
YCS|Chesterfield Inlet|Chesterfield Inlet|CA
YCY|Clyde River|Clyde River|CA
YDL|Dease Lake|Dease Lake|CA
YDP|Nain|Nain|CA
YDV|Bloodvein River|Bloodvein River|CA
YEK|Arviat|Arviat|CA
YER|Fort Severn|Fort Severn|CA
YFA|Fort Albany|Fort Albany|CA
YFH|Fort Hope|Fort Hope|CA
YFJ|Wekweètì|Wekweètì|CA
YFO|Flin Flon|Flin Flon|CA
YFX|St. Lewis (Fox Harbour)|St. Lewis|CA
YGH|Fort Good Hope|Fort Good Hope|CA
YGO|Gods Lake Narrows|Gods Lake Narrows|CA
YGT|Igloolik|Igloolik|CA
YGX|Gillam|Gillam|CA
YGZ|Grise Fiord|Grise Fiord|CA
YHA|Port Hope Simpson|Port Hope Simpson|CA
YHG|Charlottetown|Charlottetown|CA
YHI|Ulukhaktok Holman|Ulukhaktok|CA
YHK|Gjoa Haven|Gjoa Haven|CA
YHO|Hopedale|Hopedale|CA
YHP|Poplar Hill|Poplar Hill|CA
YHR|Chevery|Chevery|CA
YIK|Ivujivik|Ivujivik|CA
YIO|Pond Inlet|Pond Inlet|CA
YKG|Kangirsuk|Kangirsuk|CA
YKQ|Waskaganish|Waskaganish|CA
YKU|Chisasibi|Chisasibi|CA
YLC|Kimmirut|Kimmirut|CA
YLE|Whatì|Whatì|CA
YLH|Lansdowne House|Lansdowne House|CA
YMH|Mary's Harbour|Mary's Harbour|CA
YMN|Makkovik|Makkovik|CA
YMP|Port McNeill|Port McNeill|CA
YNC|Wemindji|Wemindji|CA
YNE|Norway House|Norway House|CA
YNO|North Spirit Lake|North Spirit Lake|CA
YNP|Natuashish|Natuashish|CA
YNS|Nemiscau|Nemiscau|CA
YOC|Old Crow|Old Crow|CA
YOG|Ogoki Post|Ogoki Post|CA
YOH|Oxford House|Oxford House|CA
YON|Yongphulla|Yongphulla|BT
YPC|Paulatuk (Nora Aliqatchialuk Ruben)|Paulatuk|CA
YPH|Inukjuak|Inukjuak|CA
YPJ|Aupaluk|Aupaluk|CA
YPM|Pikangikum|Pikangikum|CA
YPO|Peawanuck|Peawanuck|CA
YQC|Quaqtaq|Quaqtaq|CA
YRA|Rae Lakes|Gamètì|CA
YRF|Cartwright|Cartwright|CA
YRG|Rigolet|Rigolet|CA
YRS|Red Sucker Lake|Red Sucker Lake|CA
YSG|Lutselk'e|Lutselk'e|CA
YSK|Sanikiluaq|Sanikiluaq|CA
YSO|Postville|Postville|CA
YST|St. Theresa Point|St. Theresa Point|CA
YSY|Sachs Harbour (David Nasogaluak Jr. Saaryuaq)|Sachs Harbour|CA
YTE|Cape Dorset|Kinngait|CA
YTL|Big Trout Lake|Big Trout Lake|CA
YTQ|Tasiujaq|Tasiujaq|CA
YTW|Yutian Wanfang|Hotan|CN
YUD|Umiujaq|Umiujaq|CA
YUT|Naujaat|Repulse Bay|CA
YVM|Qikiqtarjuaq|Qikiqtarjuaq|CA
YVZ|Deer Lake|Deer Lake|CA
YWB|Kangiqsujuaq (Wakeham Bay)|Kangiqsujuaq|CA
YWJ|Déline|Déline|CA
YWM|Williams Harbour|Williams Harbour|CA
YWP|Webequie|Webequie|CA
YXN|Whale Cove|Whale Cove|CA
YXP|Pangnirtung|Pangnirtung|CA
YYH|Taloyoak|Taloyoak|CA
YZG|Salluit|Salluit|CA
YZZ|Trail Regional|Trail|CA
ZDY|Delma|Delma Island|AE
ZEM|Eastmain River|Eastmain River|CA
ZFD|Fond-du-Lac|Fond-du-Lac|CA
ZFL|Zhaosu Tianma|Zhaosu|CN
ZFM|Fort Mcpherson|Fort Mcpherson|CA
ZFN|Tulita|Tulita|CA
ZGI|Gods River|Gods River|CA
ZGS|La Romaine|Le Golfe-du-Saint-Laurent|CA
ZKE|Kashechewan|Kashechewan|CA
ZLT|La Tabatière|La Tabatière|CA
ZPB|Sachigo Lake|Sachigo Lake|CA
ZPC|Pucón|Pucon|CL
ZRJ|Round Lake (Weagamow Lake)|Round Lake|CA
ZTB|Tête-à-la-Baleine|Tête-à-la-Baleine|CA
ZTM|Shamattawa|Shamattawa|CA
ZUM|Churchill Falls|Churchill Falls|CA
ZWL|Wollaston Lake|Wollaston Lake|CA
AGM|Tasiilaq Heliport|Tasiilaq|GL
AGN|Angoon Seaplane Base|Angoon|US
ALZ|Alitak Seaplane Base|Lazy Bay|US
AOQ|Aappilattoq Heliport|Aappilattoq|GL
AOS|Amook Bay Seaplane Base|Amook Bay|US
BJT|Bentota River Waterdrome|Bentota|LK
BKF|Lake Brooks Seaplane Base|Katmai National Park|US
CGA|Craig Seaplane Base|Craig|US
CHE|Tallinn Linnahall Heliport|Tallinn|EE
CXH|Vancouver Harbour Water Aerodrome|Vancouver|CA
CYM|Chatham Seaplane Base|Chatham|US
DHB|Deer Harbor SPB|Deer Harbor|US
DIO|Diomede Heliport|Diomede|US
DWO|Diyawanna Oya Seaplane Base|Sri Jayawardenepura Kotte|LK
EDA|Edna Bay Seaplane Base|Edna Bay|US
ELV|Elfin Cove Seaplane Base|Elfin Cove|US
EXI|Excursion Inlet Seaplane Base|Excursion Inlet|US
FBS|Friday Harbor Seaplane Base|Friday Harbor|US
FNR|Funter Bay Seaplane Base|Funter Bay|US
GZM|Xewkija Heliport|Gozo|MT
HBT|Hambantota Seaplane Base|Hambantota|LK
HHP|Shun Tak Heliport|Central and Western|HK
HIS|Hayman Island Resort Seaplane Base|Hayman Island|AU
HYG|Hydaburg Seaplane Base|Hydaburg|US
HYL|Hollis Clark Bay Seaplane Base|Hollis|US
IKE|Ikerasak Heliport|Ikerasak|GL
IOQ|Isortoq Heliport|Isortoq|GL
IOT|Illorsuit Heliport|Illorsuit|GL
IUI|Innarsuit Heliport|Innarsuit|GL
JCH|Qasigiannguit Heliport|Qasigiannguit|GL
JCU|Ceuta Heliport|Ceuta|ES
JGO|Qeqertarsuaq Heliport|Qeqertarsuaq|GL
JGR|Kangilinnguit Heliport|Kangilinnguit|GL
JNN|Nanortalik Heliport|Nanortalik|GL
JNS|Narsaq Heliport|Narsaq|GL
JRA|West 30th Street Heliport|New York|US
JUK|Ukkusissat Heliport|Ukkusissat|GL
JUU|Nuugaatsiaq Heliport|Nuugaatsiaq|GL
KAE|Kake Seaplane Base|Kake|US
KCC|Coffman Cove Seaplane Base|Coffman Cove|US
KDZ|Polgolla Reservoir Seaplane Base|Kandy|LK
KEH|Kenmore Air Harbor LLC Seaplane Base|Kenmore|US
KGQ|Kangersuatsiaq Heliport|Kangersuatsiaq|GL
KKB|Kitoi Bay Seaplane Base|Kitoi Bay|US
KMY|Moser Bay Seaplane Base|Moser Bay|US
KOY|Olga Bay Seaplane Base|Olga Bay|US
KPB|Point Baker Seaplane Base|Point Baker|US
KPR|Port Williams Seaplane Base|Port Williams|US
KPY|Port Bailey Seaplane Base|Port Bailey|US
KTB|Thorne Bay Seaplane Base|Thorne Bay|US
KUZ|Kuummiut Heliport|Kuummiut|GL
KWP|West Point Village Seaplane Base|West Point|US
KXA|Kasaan Seaplane Base|Kasaan|US
KZB|Zachar Bay Seaplane Base|Zachar Bay|US
LBH|Palm Beach Seaplane Base|Sydney|AU
LKE|Kenmore Air Harbor Seaplane Base|Seattle|US
LLU|Alluitsup Paa Heliport|Alluitsup Paa|GL
MCM|Monaco Heliport|Fontvieille|MC
MTM|Metlakatla Seaplane Base|Metlakatla|US
NIQ|Niaqornat Heliport|Niaqornat|GL
NKI|Naukati Bay Seaplane Base|Tuxekan Island|US
NSB|Bimini North Seaplane Base|Bimini|BS
NYS|New York Skyports Inc Seaplane Base|New York|US
OBY|Ittoqqortoormiit Heliport|Ittoqqortoormiit|GL
PEC|Pelican Seaplane Base|Pelican|US
PPV|Port Protection Seaplane Base|Port Protection|US
PQT|Qeqertaq Heliport|Qeqertaq|GL
PTD|Port Alexander Seaplane Base|Port Alexander|US
PZE|Penzance Heliport|Penzance, Cornwall|GB
QCU|Akunnaaq Heliport|Akunnaaq|GL
QFG|Eqalugaarsuit Heliport|Eqalugaarsuit|GL
QFI|Iginniarfik Heliport|Iginniarfik|GL
QFN|Narsarmijit Heliport|Narsarmijit|GL
QFX|Igaliku Heliport|Igaliku|GL
QGQ|Attu Heliport|Attu|GL
QJE|Kitsissuarsuit Heliport|Kitsissuarsuit|GL
QJH|Qassimiut Heliport|Qassimiut|GL
QJI|Ikamiut Heliport|Ikamiut|GL
QOQ|Saarloq Heliport|Saarloq|GL
QPW|Kangaatsiaq Heliport|Kangaatsiaq|GL
QRY|Ikerassaarsuk Heliport|Ikerassaarsuk|GL
QUV|Aappilattoq Heliport|Aappilattoq|GL
QUW|Ammassivik Heliport|Ammassivik|GL
RSJ|Rosario Seaplane Base|Rosario|US
SAE|Saattut Heliport|Saattut|GL
SGG|Sermiligaaq Heliport|Sermiligaaq|GL
SPB|Charlotte Amalie Harbor Seaplane Base|Charlotte Amalie|VI
SRK|Siorapaluk Heliport|Siorapaluk|GL
SSB|Christiansted Harbor Seaplane Base|Christiansted|VI
SVR|Savissivik Heliport|Savissivik|GL
SYB|Seal Bay Seaplane Base|Seal Bay|US
SYF|Silva Bay Seaplane Base|Gabriola Island|CA
TKE|Tenakee Seaplane Base|Tenakee Springs|US
TQA|Tasiusaq Heliport|Tasiusaq|GL
TQI|Tiniteqilaaq Heliport|Tiniteqilaaq|GL
TQR|San Domino Island Heliport|Tremiti Islands|IT
TSS|East 34th Street Heliport|New York|US
TTW|Tissa Tank Waterdrome|Tissamaharama|LK
UAK|Narsarsuaq|Narsarsuaq|GL
UGI|San Juan /Uganik/ Seaplane Base|San Juan|US
UMD|Uummannaq Heliport|Uummannaq|GL
VRY|Værøy Heliport|Værøy|NO
WFB|Ketchikan Harbor Seaplane Base|Ketchikan|US
WHD|Hyder Seaplane Base|Hyder|US
WPL|Powell Lake Seaplane Base|Powell River|CA
WSX|Westsound/WSX Seaplane Base|West Sound|US
WWP|Whale Pass Seaplane Float Harbor Facility|Whale Pass|US
XEQ|Tasiusaq Heliport|Tasiusak|GL
XIQ|Ilimanaq Heliport|Ilimanaq|GL
YAJ|Lyall Harbour Seaplane Base|Saturna Island|CA
YAQ|Maple Bay Seaplane Base|Maple Bay|CA
YAV|Mayne Island Seaplane Base|Miners Bay|CA
YBF|Bamfield Seaplane Base|Bamfield|CA
YBQ|Telegraph Harbour Seaplane Base|Thetis Island|CA
YBW|Bedwell Harbour Seaplane Base|Bedwell Harbour|CA
YGG|Ganges Seaplane Base|Salt Spring Island|CA
YGN|Greenway Sound Seaplane Base|Broughton Island|CA
YHH|Campbell River Seaplane Base|Campbell River|CA
YIG|Big Bay Seaplane Base|Stuart Island|CA
YMF|Montague Harbour Seaplane Base|Galiano Island|CA
YTG|Sullivan Bay Seaplane Base|Sullivan Bay|CA
YTP|Tofino Harbour Seaplane Base|Tofino|CA
YWH|Victoria Harbour Seaplane Base|Victoria|CA
YWS|Whistler/Green Lake Water Aerodrome|Whistler|CA
ZNA|Nanaimo Harbour Water Aerodrome|Nanaimo|CA`;

let CACHE: Airport[] | null = null;

function all(): Airport[] {
  if (CACHE) return CACHE;
  CACHE = BLOB.split('\n').filter(Boolean).map(l => {
    const [iata, name, city, cc] = l.split('|');
    return { iata, name, city, cc };
  });
  return CACHE;
}

const startsWord = (text: string, s: string) =>
  text.split(/[\s-]+/).some(w => w.startsWith(s));

/**
 * Rank matters more than matching. An exact IATA code is nearly always what
 * was meant, a code prefix next, then a city starting with the query, and only
 * then looser forms. Without that order "LON" surfaces obscure fields ahead of
 * London.
 *
 * Any *word* of the airport name counts as a start, so a query can reach
 * Singapore Changi through "Changi" and not only through the city.
 *
 * Equal ranks break on position in the table, which is sorted large airports
 * first — so "Sing" gives Singapore before Singkil and "LON" gives London
 * before Long Beach. Ranking those by string length instead looks reasonable
 * and is wrong: it prefers Singkil, whose name is simply shorter.
 */
export function searchAirports(q: string, limit = 6): Airport[] {
  const s = q.trim().toLowerCase();
  if (s.length < 2) return [];
  const list = all();
  const scored: { i: number; rank: number }[] = [];
  for (let i = 0; i < list.length; i++) {
    const a = list[i];
    const iata = a.iata.toLowerCase();
    const city = a.city.toLowerCase();
    const name = a.name.toLowerCase();
    let rank = -1;
    if (iata === s) rank = 0;
    else if (iata.startsWith(s)) rank = 1;
    else if (city.startsWith(s)) rank = 2;
    else if (name.startsWith(s)) rank = 3;
    else if (startsWord(city, s) || startsWord(name, s)) rank = 4;
    else if (city.includes(s) || name.includes(s)) rank = 5;
    if (rank >= 0) scored.push({ i, rank });
  }
  scored.sort((x, y) => x.rank - y.rank || x.i - y.i);
  return scored.slice(0, limit).map(x => list[x.i]);
}

/** "BKK" -> "Bangkok (BKK)". Unknown codes pass through untouched. */
export function labelFor(code: string): string {
  const a = all().find(x => x.iata === code.trim().toUpperCase());
  return a ? `${a.city || a.name} (${a.iata})` : code;
}
