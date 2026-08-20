/**
 * IATA airport table — every large/medium airport with scheduled service.
 *
 * GENERATED. Do not hand-edit — rebuild instead:
 *
 *     curl -sS -o /tmp/airports.csv \
 *       https://davidmegginson.github.io/ourairports-data/airports.csv
 *     python3 app/scripts/build_airports.py /tmp/airports.csv > app/src/airports.ts
 *
 * Source: OurAirports (https://ourairports.com/data/), public domain.
 * Snapshot taken 2026-08-20.
 *
 * Shipped in the bundle rather than queried, for two reasons. Autocomplete
 * fires on every keystroke and AeroDataBox meters by API unit, so querying it
 * would meter typing — exactly the workload you cannot afford. And the
 * geocoder behind the wizard is a *city* database: typing "Sing" there returns
 * Singa in Sudan and Wan Sing in Myanmar long before Singapore, and it does
 * not index IATA codes at all, which is how a flight leg is actually written.
 *
 * COORDINATES, at 2dp. "Which airports serve this destination" is a distance
 * question, and it used to be answered by matching city names — which grouped
 * Tokyo to HND alone, missed Milan entirely, and offered New York a heliport.
 * 2dp is ~1.1km, three orders of magnitude finer than the ~100km radius it is
 * asked about, and 16KB smaller than 4dp.
 *
 * Filtered to type large_airport/medium_airport with scheduled_service=yes.
 * The type filter is what removes helipads and seaplane bases; scheduled
 * service alone does not — JRA carried scheduled service and is a helipad.
 *
 * Stored as one delimited string rather than an array of objects: far smaller
 * than the equivalent JSON, parsed once on first search and cached.
 */
export type Airport = {
  iata: string; name: string; city: string; cc: string;
  lat: number; lng: number;
  /** true for OurAirports' large_airport. Used to rank a picker, not to filter:
   *  Luton is medium and nobody would accept a London list without it. */
  large: boolean;
};

const BLOB = `\
AAC|El Arish International Airport|El Arish|EG|31.06|33.83|1
AAE|Annaba Rabah Bitat Airport|Annaba|DZ|36.83|7.81|1
AAL|Aalborg Airport|Aalborg|DK|57.09|9.85|1
AAN|Al Ain International Airport|Al Ain|AE|24.26|55.61|1
AAR|Aarhus Airport|Aarhus|DK|56.3|10.62|1
ABA|Abakan International Airport|Abakan|RU|53.74|91.39|1
ABB|Asaba International Airport|Asaba|NG|6.2|6.67|1
ABD|Abadan Ayatollah Jami International Airport|Abadan|IR|30.37|48.23|1
ABJ|Félix-Houphouët-Boigny International Airport|Abidjan|CI|5.26|-3.93|1
ABQ|Albuquerque International Sunport|Albuquerque|US|35.04|-106.61|1
ABV|Nnamdi Azikiwe International Airport|Abuja|NG|9.01|7.26|1
ABZ|Aberdeen International Airport|Aberdeen|GB|57.2|-2.2|1
ACA|General Juan N. Álvarez International Airport|Acapulco|MX|16.76|-99.75|1
ACC|Kotoka International Airport|Accra|GH|5.61|-0.17|1
ACE|César Manrique-Lanzarote Airport|San Bartolomé|ES|28.95|-13.61|1
ADB|Adnan Menderes International Airport|Gaziemir|TR|38.29|27.16|1
ADD|Addis Ababa Bole International Airport|Addis Ababa|ET|8.98|38.8|1
ADE|Aden International Airport|Aden|YE|12.83|45.03|1
ADJ|Marka International (Amman Civil) Airport|Amman|JO|31.97|35.99|1
ADL|Adelaide International Airport|Adelaide|AU|-34.95|138.53|1
ADZ|Gustavo Rojas Pinilla International Airport|San Andrés|CO|12.58|-81.71|1
AEP|Aeroparque Jorge Newbery|Buenos Aires|AR|-34.56|-58.42|1
AER|Sochi International Airport|Sochi|RU|43.45|39.96|1
AES|Ålesund Airport|Ålesund|NO|62.56|6.11|1
AEY|Akureyri International Airport|Akureyri|IS|65.66|-18.07|1
AGA|Al Massira Airport|Agadir (Temsia)|MA|30.32|-9.41|1
AGP|Málaga-Costa del Sol Airport|Málaga|ES|36.67|-4.5|1
AGT|Guaraní International Airport|Ciudad del Este|PY|-25.46|-54.84|1
AGU|Aguascalientes International Airport|Aguascalientes|MX|21.7|-102.32|1
AHB|Abha International Airport|Abha|SA|18.24|42.66|1
AJF|Al-Jawf International Airport|Al-Jawf|SA|29.78|40.1|1
AKL|Auckland International Airport|Auckland|NZ|-37.01|174.79|1
AKX|Aktobe International Airport|Aktobe|KZ|50.25|57.2|1
ALA|Almaty International Airport|Almaty|KZ|43.35|77.04|1
ALB|Albany International Airport|Albany|US|42.75|-73.8|1
ALC|Alicante-Elche Miguel Hernández Airport|Alicante|ES|38.28|-0.56|1
ALG|Houari Boumediene Airport|Algiers|DZ|36.69|3.21|1
ALP|Aleppo International Airport|Aleppo|SY|36.18|37.23|1
AMD|Sardar Vallabh Patel International Airport|Ahmedabad|IN|23.08|72.63|1
AMM|Queen Alia International Airport|Amman|JO|31.72|35.99|1
AMQ|Pattimura International Airport|Ambon|ID|-3.71|128.09|1
AMS|Amsterdam Airport Schiphol|Amsterdam|NL|52.31|4.76|1
ANC|Ted Stevens Anchorage International Airport|Anchorage|US|61.18|-149.99|1
ANF|Andrés Sabella Gálvez International Airport|Antofagasta|CL|-23.45|-70.45|1
ANU|V. C. Bird International Airport|Osbourn|AG|17.14|-61.79|1
AOE|Hasan Polatkan Airport|Eskişehir|TR|39.81|30.52|1
AOJ|Aomori Airport|Aomori|JP|40.73|140.69|1
APL|Nampula Airport|Nampula|MZ|-15.11|39.28|1
APW|Faleolo International Airport|Apia|WS|-13.83|-172.01|1
AQI|Qaisumah–Hafar Al-Batin International Airport|Qaisumah|SA|28.34|46.13|1
AQJ|King Hussein International Airport|Aqaba|JO|29.61|35.02|1
AQP|Rodríguez Ballón International Airport|Arequipa|PE|-16.34|-71.57|1
ARN|Stockholm-Arlanda Airport|Stockholm|SE|59.65|17.93|1
ASB|Ashgabat International Airport|Ashgabat|TM|37.99|58.36|1
ASF|Astrakhan Narimanovo Boris M. Kustodiev International Airport|Astrakhan|RU|46.28|48.01|1
ASR|Kayseri Erkilet International Airport|Kayseri|TR|38.77|35.5|1
ASU|Silvio Pettirossi International Airport|Asunción|PY|-25.24|-57.52|1
ASW|Aswan International Airport|Aswan|EG|23.96|32.82|1
ATH|Athens Eleftherios Venizelos International Airport|Spata-Artemida|GR|37.94|23.94|1
ATL|Hartsfield Jackson Atlanta International Airport|Atlanta|US|33.64|-84.43|1
ATQ|Sri Guru Ram Das Ji International Airport|Amritsar|IN|31.71|74.8|1
ATZ|Asyut International Airport|Asyut|EG|27.05|31.01|1
AUA|Queen Beatrix International Airport|Oranjestad|AW|12.5|-70.01|1
AUH|Zayed International Airport|Abu Dhabi|AE|24.44|54.65|1
AUS|Austin Bergstrom International Airport|Austin|US|30.2|-97.66|1
AVV|Melbourne Avalon International Airport|Geelong/Melbourne|AU|-38.04|144.47|1
AWA|Hawassa International Airport|Hawassa|ET|7.1|38.4|1
AWZ|Qasem Soleimani International Airport|Ahvaz|IR|31.34|48.76|1
AYT|Antalya International Airport|Antalya|TR|36.9|30.8|1
BAH|Bahrain International Airport|Manama|BH|26.27|50.64|1
BAQ|Ernesto Cortissoz International Airport|Barranquilla|CO|10.89|-74.78|1
BAV|Baotou Donghe International Airport|Baotou|CN|40.56|110.0|1
BAX|Barnaul Gherman Titov International Airport|Barnaul|RU|53.36|83.54|1
BBI|Biju Patnaik International Airport|Bhubaneswar|IN|20.25|85.81|1
BBK|Kasane International Airport|Kasane|BW|-17.83|25.17|1
BBU|Bucharest Băneasa Aurel Vlaicu International Airport|Bucharest|RO|44.5|26.1|1
BCD|Bacolod-Silay International Airport|Bacolod City|PH|10.78|123.02|1
BCM|Bacău George Enescu International  Airport|Bacău|RO|46.52|26.91|1
BCN|Josep Tarradellas Barcelona-El Prat Airport|Barcelona|ES|41.3|2.08|1
BCU|Sir Abubakar Tafawa Balewa Bauchi State International Airport|Bauchi|NG|10.48|9.74|1
BDA|L.F. Wade International Airport|Hamilton|BM|32.36|-64.68|1
BDJ|Syamsudin Noor International Airport|Banjarbaru|ID|-3.44|114.76|1
BDL|Bradley International Airport|Hartford|US|41.94|-72.69|1
BDQ|Vadodara International Airport|Vadodara|IN|22.34|73.23|1
BDS|Brindisi Airport|Brindisi|IT|40.66|17.95|1
BEG|Belgrade Nikola Tesla Airport|Belgrade|RS|44.82|20.31|1
BEL|Val de Cans/Júlio Cezar Ribeiro International Airport|Belém|BR|-1.38|-48.48|1
BEM|Beni Mellal Airport|Oulad Yaich|MA|32.4|-6.32|1
BEN|Benina International Airport|Benina|LY|32.1|20.27|1
BER|Berlin Brandenburg Airport|Berlin|DE|52.36|13.5|1
BES|Brest Bretagne airport|Brest|FR|48.45|-4.42|1
BEW|Beira International Airport|Beira|MZ|-19.8|34.91|1
BEY|Beirut Rafic Hariri International Airport|Beirut|LB|33.82|35.49|1
BFN|Bram Fischer International Airport|Bloemfontein|ZA|-29.09|26.3|1
BFS|Belfast International Airport|Belfast|GB|54.66|-6.22|1
BGF|Bangui M'Poko International Airport|Bangui|CF|4.4|18.52|1
BGI|Grantley Adams International Airport|Bridgetown|BB|13.07|-59.49|1
BGO|Bergen Airport, Flesland|Bergen|NO|60.29|5.22|1
BGW|Baghdad International Airport / New Al Muthana Air Base|Baghdad|IQ|33.26|44.23|1
BGY|Il Caravaggio International Airport|Orio al Serio (BG)|IT|45.67|9.71|1
BHK|Bukhara International Airport|Bukhara|UZ|39.78|64.48|1
BHM|Birmingham-Shuttlesworth International Airport|Birmingham|US|33.56|-86.75|1
BHO|Raja Bhoj International Airport|Bhopal|IN|23.29|77.34|1
BHX|Birmingham Airport|Birmingham, West Midlands|GB|52.45|-1.75|1
BIA|Bastia-Poretta International airport|Bastia|FR|42.55|9.48|1
BIO|Bilbao Airport|Bilbao|ES|43.3|-2.91|1
BJA|Soummam–Abane Ramdane Airport|Béjaïa|DZ|36.71|5.07|1
BJL|Banjul International Airport|Banjul (Yundum)|GM|13.34|-16.65|1
BJM|Bujumbura Melchior Ndadaye International Airport|Bujumbura|BI|-3.32|29.32|1
BJV|Milas Bodrum International Airport|Bodrum|TR|37.25|27.66|1
BJX|Guanajuato International Airport|Silao|MX|20.99|-101.48|1
BKI|Kota Kinabalu International Airport|Kota Kinabalu|MY|5.93|116.05|1
BKK|Suvarnabhumi Airport|Bangkok|TH|13.68|100.75|1
BKO|Modibo Keita International Airport|Bamako|ML|12.53|-7.95|1
BLA|General José Antonio Anzoategui International Airport|Barcelona|VE|10.11|-64.69|1
BLJ|Batna Mostefa Ben Boulaid Airport|Batna|DZ|35.75|6.31|1
BLL|Billund Airport|Billund|DK|55.74|9.16|1
BLQ|Bologna Guglielmo Marconi Airport|Bologna|IT|44.54|11.29|1
BLR|Kempegowda International Airport Bengaluru|Bengaluru|IN|13.2|77.71|1
BLZ|Chileka International Airport|Blantyre|MW|-15.68|34.97|1
BME|Broome International Airport|Broome|AU|-17.95|122.23|1
BNA|Nashville International Airport|Nashville|US|36.12|-86.68|1
BND|Bandar Abbas International Airport|Bandar Abbas|IR|27.22|56.38|1
BNE|Brisbane International Airport|Brisbane|AU|-27.38|153.12|1
BNX|Banja Luka International Airport|Mahovljani|BA|44.94|17.3|1
BOD|Bordeaux–Mérignac Airport|Bordeaux|FR|44.83|-0.72|1
BOG|El Dorado International Airport|Bogota|CO|4.7|-74.15|1
BOI|Boise Air Terminal/Gowen Field|Boise|US|43.56|-116.22|1
BOJ|Burgas Airport|Burgas|BG|42.57|27.52|1
BOM|Chhatrapati Shivaji Maharaj International Airport|Mumbai|IN|19.09|72.87|1
BON|Flamingo International Airport|Kralendijk|BQ|12.13|-68.27|1
BOO|Bodø Airport|Bodø|NO|67.27|14.37|1
BOS|Boston Logan International Airport|Boston|US|42.36|-71.01|1
BOY|Bobo Dioulasso Airport|Bobo Dioulasso|BF|11.16|-4.33|1
BPN|Sultan Aji Muhammad Sulaiman Sepinggan International Airport|Balikpapan|ID|-1.27|116.89|1
BPS|Porto Seguro International Airport|Porto Seguro|BR|-16.44|-39.08|1
BQT|Brest International Airport|Brest|BY|52.11|23.9|1
BRC|Teniente Luis Candelaria International Airport|San Carlos de Bariloche|AR|-41.15|-71.16|1
BRE|Bremen Airport|Bremen|DE|53.05|8.79|1
BRI|Bari Karol Wojtyła International Airport|Bari|IT|41.14|16.76|1
BRM|Jacinto Lara International Airport|Barquisimeto|VE|10.04|-69.36|1
BRS|Bristol Airport|Bristol|GB|51.38|-2.72|1
BRU|Brussels Airport|Zaventem|BE|50.9|4.48|1
BSA|Bender Qassim International Airport|Bosaso|SO|11.28|49.14|1
BSB|Presidente Juscelino Kubitschek International Airport|Brasília|BR|-15.87|-47.92|1
BSG|Bata International Airport|Bata|GQ|1.91|9.81|1
BSK|Biskra - Mohamed Khider Airport|Biskra|DZ|34.79|5.74|1
BSL|EuroAirport Basel–Mulhouse–Freiburg|Bâle / Mulhouse|FR|47.6|7.52|1
BSR|Basra International Airport|Basra|IQ|30.55|47.66|1
BSZ|Manas International Airport|Bishkek|KG|43.06|74.48|1
BTH|Hang Nadim International Airport|Batam|ID|1.12|104.12|1
BTJ|Sultan Iskandar Muda International Airport|Banda Aceh|ID|5.53|95.42|1
BTS|M. R. Štefánik Airport|Bratislava|SK|48.17|17.21|1
BUD|Budapest Liszt Ferenc International Airport|Budapest|HU|47.43|19.26|1
BUF|Buffalo Niagara International Airport|Buffalo|US|42.94|-78.73|1
BUQ|Joshua Mqabuko Nkomo International Airport|Bulawayo|ZW|-20.02|28.62|1
BUR|Hollywood Burbank/Bob Hope Airport|Burbank|US|34.2|-118.36|1
BUS|Alexander Kartveli Batumi International Airport|Batumi|GE|41.61|41.6|1
BVA|Beauvais-Tillé airport|Beauvais|FR|49.45|2.11|1
BVB|Atlas Brasil Cantanhede International Airport|Boa Vista|BR|2.85|-60.69|1
BVC|Aristides Pereira International Airport|Rabil|CV|16.14|-22.89|1
BWA|Gautam Buddha International Airport|Siddharthanagar (Bhairahawa)|NP|27.5|83.41|1
BWI|Baltimore/Washington International Thurgood Marshall Airport|Baltimore|US|39.18|-76.67|1
BWN|Brunei International Airport|Bandar Seri Begawan|BN|4.94|114.93|1
BXY|Baikonur Krayniy International Airport|Baikonur|KZ|45.62|63.21|1
BZE|Philip S. W. Goldson International Airport|Belize City|BZ|17.54|-88.3|1
BZV|Maya-Maya International Airport|Brazzaville|CG|-4.25|15.25|1
CAG|Cagliari Elmas Airport|Cagliari|IT|39.25|9.05|1
CAI|Cairo International Airport|Cairo|EG|30.11|31.4|1
CAN|Guangzhou Baiyun International Airport|Guangzhou (Huadu)|CN|23.39|113.3|1
CAP|Cap Haitien International Airport|Cap Haitien|HT|19.73|-72.2|1
CAY|Cayenne – Félix Eboué Airport|Matoury|GF|4.82|-52.36|1
CBB|Jorge Wilsterman International Airport|Cochabamba|BO|-17.42|-66.18|1
CCJ|Calicut International Airport|Calicut|IN|11.14|75.96|1
CCK|Cocos (Keeling) Islands Airport|West Island|CC|-12.19|96.83|1
CCP|Carriel Sur International Airport|Concepcion|CL|-36.77|-73.06|1
CCS|Maiquetía Simón Bolívar International Airport|Maiquetía|VE|10.6|-66.99|1
CCU|Netaji Subhash Chandra Bose International Airport|Kolkata|IN|22.65|88.45|1
CDG|Charles de Gaulle International Airport|Paris (Roissy-en-France, Val-d'Oise)|FR|49.01|2.55|1
CEB|Mactan Cebu International Airport|Cebu City/Lapu-Lapu City|PH|10.31|123.98|1
CEI|Mae Fah Luang - Chiang Rai International Airport|Chiang Rai|TH|19.95|99.88|1
CEK|Kurchatov Chelyabinsk International Airport|Chelyabinsk|RU|55.3|61.5|1
CFE|Clermont-Ferrand Auvergne airport|Clermont-Ferrand|FR|45.79|3.17|1
CFK|Chlef Aboubakr Belkaid International Airport|Chlef|DZ|36.22|1.34|1
CFU|Corfu Ioannis Kapodistrias International Airport|Kerkyra (Corfu)|GR|39.6|19.91|1
CGB|Várzea Grande–Marechal Rondon International Airport|Cuiabá|BR|-15.65|-56.12|1
CGH|Congonhas–Deputado Freitas Nobre Airport|São Paulo|BR|-23.63|-46.65|1
CGK|Soekarno-Hatta International Airport|Jakarta|ID|-6.13|106.66|1
CGN|Cologne Bonn Airport|Köln (Cologne)|DE|50.87|7.14|1
CGO|Zhengzhou Xinzheng International Airport|Zhengzhou|CN|34.53|113.85|1
CGP|Shah Amanat International Airport|Chattogram (Chittagong)|BD|22.25|91.81|1
CGQ|Changchun Longjia International Airport|Changchun|CN|44.0|125.68|1
CGY|Laguindingan International Airport|Laguindingan|PH|8.61|124.46|1
CHC|Christchurch International Airport|Christchurch|NZ|-43.49|172.53|1
CHQ|Chania International Airport|Souda|GR|35.53|24.15|1
CHS|Charleston International Airport|Charleston|US|32.9|-80.04|1
CIA|Ciampino–G. B. Pastine International Airport|Rome|IT|41.8|12.6|1
CIT|Shymkent International Airport|Shymkent|KZ|42.37|69.48|1
CIX|Capitán FAP José A. Quiñones González International Airport|Chiclayo|PE|-6.79|-79.83|1
CJB|Coimbatore International Airport|Coimbatore|IN|11.03|77.04|1
CJJ|Cheongju International Airport/Cheongju Air Base (K-59/G-513)|Cheongju|KR|36.72|127.5|1
CJS|Abraham González International Airport|Ciudad Juárez|MX|31.64|-106.43|1
CJU|Jeju International Airport|Jeju City|KR|33.51|126.49|1
CKG|Chongqing Jiangbei International Airport|Chongqing|CN|29.71|106.65|1
CKY|Ahmed Sékou Touré International Airport|Conakry|GN|9.58|-13.61|1
CLE|Cleveland Hopkins International Airport|Cleveland|US|41.41|-81.85|1
CLJ|Avram Iancu Cluj International Airport|Cluj-Napoca|RO|46.79|23.69|1
CLO|Alfonso Bonilla Aragon International Airport|Cali|CO|3.54|-76.38|1
CLT|Charlotte Douglas International Airport|Charlotte|US|35.21|-80.94|1
CMB|Bandaranaike International Colombo Airport|Colombo|LK|7.18|79.88|1
CMH|John Glenn Columbus International Airport|Columbus|US|40.0|-82.89|1
CMN|Mohammed V International Airport|Casablanca|MA|33.37|-7.59|1
CMW|Ignacio Agramonte International Airport|Camaguey|CU|21.42|-77.85|1
CND|Mihail Kogălniceanu International Airport|Constanța|RO|44.36|28.49|1
CNF|Tancredo Neves International Airport|Belo Horizonte|BR|-19.64|-43.97|1
CNN|Kannur International Airport|Kannur|IN|11.92|75.54|1
CNS|Cairns International Airport|Cairns|AU|-16.88|145.75|1
CNX|Chiang Mai International Airport|Chiang Mai|TH|18.77|98.96|1
COK|Cochin International Airport|Kochi|IN|10.15|76.4|1
COO|Cotonou Cadjehoun International Airport|Cotonou|BJ|6.36|2.38|1
COR|Ingeniero Aeronáutico Ambrosio L.V. Taravella International Airport|Cordoba|AR|-31.31|-64.21|1
COS|City of Colorado Springs Municipal Airport|Colorado Springs|US|38.81|-104.7|1
COV|Çukurova International Airport|Tarsus|TR|36.89|35.07|1
CPH|Copenhagen Kastrup Airport|Copenhagen|DK|55.62|12.66|1
CPT|Cape Town International Airport|Cape Town|ZA|-33.97|18.6|1
CRA|Craiova International Airport|Craiova|RO|44.32|23.89|1
CRD|General Enrique Mosconi International Airport|Comodoro Rivadavia|AR|-45.79|-67.46|1
CRK|Clark International Airport / Clark Air Base|Mabalacat|PH|15.19|120.56|1
CRL|Brussels South Charleroi Airport|Charleroi|BE|50.46|4.46|1
CRZ|Türkmenabat International Airport|Türkmenabat|TM|38.93|63.56|1
CSX|Changsha Huanghua International Airport|Changsha (Changsha)|CN|28.19|113.22|1
CTA|Catania-Fontanarossa Airport|Catania|IT|37.47|15.07|1
CTG|Rafael Nuñez International Airport|Cartagena|CO|10.44|-75.51|1
CTS|New Chitose Airport|Sapporo|JP|42.77|141.69|1
CTU|Chengdu Shuangliu International Airport|Chengdu (Shuangliu)|CN|30.56|103.95|1
CUL|Bachigualato Federal International Airport|Culiacán|MX|24.77|-107.48|1
CUN|Cancún International Airport|Cancún|MX|21.04|-86.87|1
CUR|Hato International Airport|Willemstad|CW|12.19|-68.96|1
CUU|General Roberto Fierro Villalobos International Airport|Chihuahua|MX|28.7|-105.96|1
CUZ|Alejandro Velasco Astete International Airport|Cusco|PE|-13.54|-71.94|1
CVG|Cincinnati Northern Kentucky International Airport|Cincinnati / Covington|US|39.05|-84.67|1
CWB|Curitiba-Afonso Pena International Airport|Curitiba|BR|-25.53|-49.18|1
CWL|Cardiff International Airport|Cardiff|GB|51.4|-3.34|1
CXI|Cassidy International Airport|Kiritimati|KI|1.99|-157.35|1
CXR|Cam Ranh International Airport / Cam Ranh Air Base|Nha Trang/nha Trang aiurportCam Ranh|VN|12.0|109.22|1
CZL|Mohamed Boudiaf International Airport|Constantine|DZ|36.28|6.62|1
CZM|Cozumel International Airport|Cozumel|MX|20.51|-86.93|1
DAC|Hazrat Shahjalal International Airport|Dhaka|BD|23.84|90.4|1
DAD|Da Nang International Airport|Da Nang|VN|16.04|108.2|1
DAL|Dallas Love Field|Dallas|US|32.84|-96.85|1
DAM|Damascus International Airport|Damascus|SY|33.41|36.52|1
DAR|Julius Nyerere International Airport|Dar es Salaam|TZ|-6.87|39.21|1
DAT|Datong Yungang International Airport|Datong|CN|40.06|113.48|1
DBB|El Alamein International Airport|El Alamein|EG|30.92|28.46|1
DBV|Dubrovnik Ruđer Bošković Airport|Dubrovnik|HR|42.56|18.27|1
DCA|Ronald Reagan Washington National Airport|Washington|US|38.85|-77.04|1
DEB|Debrecen International Airport|Debrecen|HU|47.49|21.62|1
DEL|Indira Gandhi International Airport|New Delhi|IN|28.56|77.1|1
DEN|Denver International Airport|Denver|US|39.86|-104.67|1
DFW|Dallas Fort Worth International Airport|Dallas-Fort Worth|US|32.9|-97.04|1
DIA|Doha International Airport|Doha|QA|25.26|51.57|1
DIL|Presidente Nicolau Lobato International Airport|Dili|TL|-8.55|125.52|1
DIR|Aba Tenna Dejazmach Yilma International Airport|Dire Dawa|ET|9.62|41.86|1
DJE|Djerba Zarzis International Airport|Mellita|TN|33.87|10.78|1
DJG|Tiska Djanet Airport|Djanet|DZ|24.29|9.46|1
DJJ|Dortheys Hiyo Eluay International Airport|Sentani|ID|-2.58|140.52|1
DJT|President Donald J. Trump International Airport|West Palm Beach|US|26.68|-80.1|1
DKR|Léopold Sédar Senghor International Airport|Dakar|SN|14.74|-17.48|1
DLA|Douala International Airport|Douala|CM|4.01|9.72|1
DLC|Dalian Zhoushuizi International Airport|Dalian (Ganjingzi)|CN|38.97|121.54|1
DLM|Dalaman International Airport|Dalaman|TR|36.71|28.79|1
DMB|Taraz International Airport|Taraz|KZ|42.85|71.3|1
DME|Domodedovo International Airport|Moscow|RU|55.41|37.91|1
DMK|Don Mueang International Airport|Bangkok|TH|13.91|100.61|1
DMM|King Fahd International Airport|Ad Dammam|SA|26.47|49.8|1
DNH|Dunhuang Mogao International Airport|Dunhuang|CN|40.16|94.81|1
DOH|Hamad International Airport|Doha|QA|25.27|51.61|1
DPS|Denpasar I Gusti Ngurah Rai International Airport|Kuta, Badung|ID|-8.75|115.17|1
DQM|Duqm International Airport|Duqm|OM|19.5|57.63|1
DRP|Bicol International Airport|Legazpi|PH|13.11|123.68|1
DRS|Dresden Airport|Dresden|DE|51.13|13.77|1
DRW|Darwin International Airport / RAAF Darwin|Darwin|AU|-12.41|130.88|1
DSM|Des Moines International Airport|Des Moines|US|41.53|-93.66|1
DSN|Ordos Ejin Horo International Airport|Ordos|CN|39.49|109.86|1
DSS|Blaise Diagne International Airport|Dakar|SN|14.67|-17.07|1
DSY|Dara Sakor International Airport|Ta Noun|KH|10.91|103.23|1
DTM|Dortmund Airport|Dortmund|DE|51.52|7.61|1
DTW|Detroit Metropolitan Wayne County Airport|Detroit|US|42.21|-83.35|1
DUB|Dublin Airport|Dublin|IE|53.43|-6.26|1
DUR|King Shaka International Airport|Durban|ZA|-29.61|31.12|1
DUS|Düsseldorf Airport|Düsseldorf|DE|51.29|6.77|1
DVO|Francisco Bangoy International Airport|Davao|PH|7.13|125.65|1
DWC|Al Maktoum International Airport|Dubai(Jebel Ali)|AE|24.9|55.16|1
DXB|Dubai International Airport|Dubai|AE|25.25|55.37|1
DXN|Noida International Airport|Gautam Buddha Nagar|IN|28.18|77.61|1
DYG|Zhangjiajie Hehua International Airport|Zhangjiajie (Yongding)|CN|29.1|110.44|1
DYU|Dushanbe International Airport|Dushanbe|TJ|38.54|68.82|1
DZA|Dzaoudzi Pamandzi International Airport|Dzaoudzi|YT|-12.81|45.28|1
DZN|Zhezkazgan National Airport|Zhezkazgan|KZ|47.71|67.74|1
EBB|Entebbe International Airport|Entebbe|UG|0.04|32.44|1
EBL|Erbil International Airport|Arbil|IQ|36.24|43.95|1
ECN|Ercan International Airport|Tymbou (Kirklar)|CY|35.15|33.51|1
EDI|Edinburgh Airport|Ingliston, Edinburgh|GB|55.95|-3.37|1
EDL|Eldoret International Airport|Eldoret|KE|0.4|35.24|1
EDO|Balıkesir Koca Seyit Airport|Edremit|TR|39.55|27.01|1
EHU|Ezhou Huahu International Airport|Ezhou|CN|30.34|115.04|1
EIN|Eindhoven Airport|Eindhoven|NL|51.45|5.37|1
EIS|Terrance B. Lettsome International Airport|Beef Island|VG|18.45|-64.54|1
ELP|El Paso International Airport|El Paso|US|31.81|-106.38|1
ELQ|Prince Naif bin Abdulaziz International Airport|Qassim|SA|26.3|43.77|1
ELS|King Phalo Airport|East London|ZA|-33.04|27.83|1
EMA|East Midlands Airport|Nottingham, Leicestershire|GB|52.83|-1.33|1
ENO|Teniente Ramon A. Ayub Gonzalez International Airport|Encarnación|PY|-27.23|-55.84|1
ENU|Akanu Ibiam International Airport|Enegu|NG|6.47|7.56|1
ERF|Erfurt-Weimar Airport|Erfurt|DE|50.98|10.96|1
ESB|Esenboğa International Airport|Ankara|TR|40.13|33.0|1
ESM|Carlos Concha Torres International Airport|Tachina|EC|0.98|-79.63|1
ETM|Ramon International Airport|Eilat|IL|29.73|35.01|1
EUN|Laayoune Hassan I International Airport|El Aaiún|EH|27.14|-13.22|1
EVE|Harstad/Narvik Airport|Evenes|NO|68.49|16.68|1
EVN|Zvartnots International Airport|Yerevan|AM|40.15|44.4|1
EWR|Newark Liberty International Airport|Newark|US|40.69|-74.17|1
EZE|Ezeiza International Airport - Ministro Pistarini|Buenos Aires (Ezeiza)|AR|-34.82|-58.54|1
FAE|Vágar Airport|Vágar|FO|62.06|-7.28|1
FAO|Faro - Gago Coutinho International Airport|Faro|PT|37.02|-7.97|1
FAT|Fresno Yosemite International Airport|Fresno|US|36.78|-119.72|1
FBM|Lubumbashi International Airport|Lubumbashi|CD|-11.59|27.53|1
FCO|Rome–Fiumicino Leonardo da Vinci International Airport|Rome|IT|41.8|12.25|1
FDF|Martinique Aimé Césaire International Airport|Fort-de-France|MQ|14.59|-61.0|1
FDH|Bodensee Airport Friedrichshafen|Friedrichshafen|DE|47.67|9.51|1
FEZ|Fes Saïss International Airport|Saïss|MA|33.93|-4.98|1
FIH|Ndjili International Airport|Kinshasa|CD|-4.39|15.44|1
FJR|Fujairah International Airport|Fujairah|AE|25.11|56.33|1
FKB|Karlsruhe Baden-Baden Airport|Rheinmünster|DE|48.78|8.08|1
FKI|Bangoka International Airport|Kisangani|CD|0.48|25.34|1
FLL|Fort Lauderdale Hollywood International Airport|Fort Lauderdale|US|26.07|-80.15|1
FLN|Hercílio Luz International Airport|Florianópolis|BR|-27.67|-48.55|1
FLR|Florence Airport, Peretola|Firenze (FI)|IT|43.81|11.2|1
FMM|Memmingen Allgau Airport|Memmingen|DE|47.99|10.24|1
FMO|Münster Osnabrück Airport|Greven|DE|52.13|7.69|1
FNA|Lungi International Airport|Freetown (Lungi-Town)|SL|8.62|-13.2|1
FNC|Cristiano Ronaldo International Airport|Funchal|PT|32.7|-16.77|1
FNJ|Pyongyang Sunan International Airport|Pyongyang|KP|39.22|125.67|1
FOC|Fuzhou Changle International Airport|Fuzhou (Changle)|CN|25.93|119.67|1
FOR|Pinto Martins International Airport|Fortaleza|BR|-3.78|-38.53|1
FPO|Grand Bahama International Airport|Freeport|BS|26.56|-78.7|1
FRA|Frankfurt Main Airport|Frankfurt am Main|DE|50.03|8.56|1
FRW|Phillip Gaonwe Matante International Airport|Francistown|BW|-21.16|27.47|1
FSC|Figari Sud-Corse Airport|Figari|FR|41.5|9.1|1
FSZ|Mount Fuji Shizuoka Airport|Makinohara / Shimada|JP|34.8|138.19|1
FUE|Fuerteventura Airport|El Matorral|ES|28.45|-13.86|1
FUK|Fukuoka Airport|Fukuoka|JP|33.59|130.45|1
GAN|Gan International Airport|Gan|MV|-0.69|73.15|1
GAU|Lokpriya Gopinath Bordoloi International Airport|Guwahati|IN|26.11|91.59|1
GBE|Sir Seretse Khama International Airport|Gaborone|BW|-24.56|25.92|1
GCM|Owen Roberts International Airport|George Town|KY|19.29|-81.36|1
GDL|Guadalajara International Airport|Guadalajara|MX|20.52|-103.31|1
GDN|Gdańsk Lech Wałęsa Airport|Gdańsk|PL|54.38|18.47|1
GEG|Spokane International Airport|Spokane|US|47.62|-117.53|1
GEO|Cheddi Jagan International Airport|Georgetown|GY|6.5|-58.25|1
GES|General Santos International Airport|General Santos|PH|6.06|125.1|1
GHV|Brașov-Ghimbav International Airport|Brașov (Ghimbav)|RO|45.71|25.52|1
GIB|Gibraltar Airport|Gibraltar|GI|36.15|-5.35|1
GIG|Rio Galeão – Tom Jobim International Airport|Rio De Janeiro|BR|-22.81|-43.25|1
GJL|Jijel Ferhat Abbas Airport|Tahir|DZ|36.79|5.87|1
GLA|Glasgow Airport|Glasgow|GB|55.87|-4.43|1
GMP|Seoul Gimpo International Airport|Seoul|KR|37.56|126.79|1
GND|Maurice Bishop International Airport|Saint George's|GD|12.0|-61.79|1
GNJ|Ganja International Airport|Ganja|AZ|40.74|46.32|1
GNY|Şanlıurfa GAP Airport|Şanlıurfa|TR|37.45|38.9|1
GOA|Genoa Cristoforo Colombo Airport|Genova (GE)|IT|44.41|8.84|1
GOH|Nuuk International Airport|Nuuk|GL|64.19|-51.68|1
GOI|Goa Dabolim International Airport|Vasco da Gama|IN|15.38|73.83|1
GOJ|Nizhny Novgorod / Strigino International Airport|Nizhny Novgorod|RU|56.23|43.79|1
GOM|Goma International Airport|Goma|CD|-1.67|29.24|1
GOT|Göteborg Landvetter Airport|Göteborg|SE|57.66|12.28|1
GOU|Garoua International Airport|Garoua|CM|9.33|13.37|1
GOX|Manohar International Airport|Mopa|IN|15.74|73.86|1
GRJ|George Airport|George|ZA|-34.01|22.38|1
GRO|Girona-Costa Brava Airport|Girona|ES|41.9|2.76|1
GRQ|Groningen Airport Eelde|Groningen|NL|53.12|6.58|1
GRR|Gerald R. Ford International Airport|Grand Rapids|US|42.88|-85.52|1
GRU|São Paulo/Guarulhos–Governor André Franco Montoro International Airport|São Paulo|BR|-23.43|-46.47|1
GRV|Akhmat Kadyrov Grozny International Airport|Grozny|RU|43.39|45.7|1
GRZ|Graz Airport|Feldkirchen bei Graz|AT|46.99|15.44|1
GSM|Qeshm International Airport|Qeshm(Dayrestan)|IR|26.75|55.9|1
GSO|Piedmont Triad International Airport|Greensboro|US|36.1|-79.94|1
GSV|Gagarin International Airport|Saratov|RU|51.71|46.17|1
GUA|La Aurora International Airport|Guatemala City|GT|14.58|-90.53|1
GUM|Antonio B. Won Pat International Airport|Hagåtña|GU|13.48|144.8|1
GUW|Atyrau International Airport|Atyrau|KZ|47.12|51.82|1
GVA|Geneva International Airport|Geneva|CH|46.24|6.11|1
GWD|New Gwadar International Airport|Gurandani|PK|25.3|62.5|1
GXF|Seiyun Hadhramaut International Airport|Seiyun|YE|15.97|48.79|1
GYD|Heydar Aliyev International Airport|Baku|AZ|40.47|50.05|1
GYE|José Joaquín de Olmedo International Airport|Guayaquil|EC|-2.16|-79.88|1
GYN|Santa Genoveva International Airport|Goiânia|BR|-16.63|-49.22|1
GZT|Gaziantep Oğuzeli International Airport|Gaziantep|TR|36.95|37.48|1
HAH|Prince Said Ibrahim International Airport|Moroni|KM|-11.53|43.27|1
HAJ|Hannover Airport|Hannover|DE|52.46|9.69|1
HAK|Haikou Meilan International Airport|Haikou (Meilan)|CN|19.93|110.46|1
HAM|Hamburg Helmut Schmidt Airport|Hamburg|DE|53.63|9.99|1
HAN|Noi Bai International Airport|Hanoi (Soc Son)|VN|21.22|105.81|1
HAQ|Hanimaadhoo International Airport|Haa Dhaalu Atoll|MV|6.74|73.17|1
HAS|Hail International Airport|Hail|SA|27.44|41.69|1
HAV|José Martí International Airport|Havana|CU|22.99|-82.41|1
HBA|Hobart International Airport|Hobart (Cambridge)|AU|-42.84|147.51|1
HBE|Alexandria International Airport|Alexandria|EG|30.93|29.7|1
HDY|Hat Yai International Airport|Hat Yai|TH|6.93|100.39|1
HEA|Herat - Khwaja Abdullah Ansari International Airport|Guzara|AF|34.21|62.23|1
HEL|Helsinki Vantaa Airport|Helsinki (Vantaa)|FI|60.32|24.96|1
HER|Heraklion International Nikos Kazantzakis Airport|Heraklion|GR|35.34|25.18|1
HET|Hohhot Baita International Airport|Hohhot|CN|40.85|111.82|1
HFE|Hefei Xinqiao International Airport|Hefei|CN|31.99|116.98|1
HGA|Egal International Airport|Hargeisa|SO|9.51|44.08|1
HGH|Hangzhou Xiaoshan International Airport|Hangzhou|CN|30.24|120.43|1
HHN|Frankfurt-Hahn Airport|Frankfurt am Main (Lautzenhausen)|DE|49.95|7.26|1
HIA|Huai'an Lianshui Airport|Huai'an|CN|33.79|119.13|1
HIJ|Hiroshima Airport|Hiroshima|JP|34.44|132.92|1
HIR|Honiara International Airport|Honiara|SB|-9.43|160.05|1
HKD|Hakodate Airport|Hakodate|JP|41.77|140.82|1
HKG|Hong Kong International Airport|Hong Kong|HK|22.31|113.91|1
HKT|Phuket International Airport|Phuket|TH|8.11|98.32|1
HLA|Lanseria International Airport|Johannesburg|ZA|-25.94|27.93|1
HLD|Hulunbuir Hailar Airport|Hailar|CN|49.21|119.82|1
HLP|Halim Perdanakusuma International Airport|Jakarta|ID|-6.27|106.89|1
HMB|Suhaj International Airport|Suhaj|EG|26.34|31.74|1
HMO|General Ignacio L. Pesqueira International Airport|Hermosillo|MX|29.09|-111.05|1
HND|Tokyo Haneda International Airport|Tokyo|JP|35.55|139.79|1
HNL|Daniel K. Inouye International Airport|Honolulu, Oahu|US|21.32|-157.93|1
HOF|Al-Ahsa International Airport|Hofuf|SA|25.29|49.49|1
HOG|Frank Pais International Airport|Holguin|CU|20.79|-76.32|1
HOU|William P. Hobby Airport|Houston|US|29.65|-95.28|1
HPH|Cat Bi International Airport|Haiphong (Hai An)|VN|20.82|106.72|1
HRB|Harbin Taiping International Airport|Harbin|CN|45.62|126.25|1
HRE|Robert Gabriel Mugabe International Airport|Harare|ZW|-17.93|31.09|1
HRG|Hurghada International Airport|Hurghada|EG|27.18|33.8|1
HSA|Hazrat Sultan International Airport|Turkıstan|KZ|43.31|68.55|1
HSG|Kyushu Saga International Airport|Saga|JP|33.15|130.3|1
HSN|Zhoushan Putuoshan International Airport|Zhoushan|CN|29.93|122.36|1
HSR|Rajkot International Airport|Rajkot|IN|22.38|71.04|1
HSS|Maharaja Agrasen International Airport|Hisar|IN|29.19|75.74|1
HTA|Chita-Kadala International Airport|Chita|RU|52.02|113.31|1
HUN|Hualien Chiashan Airport|Hualien City|TW|24.02|121.62|1
HUX|Bahías de Huatulco International Airport|Huatulco|MX|15.78|-96.26|1
HWR|Halwara International Airport|Halwara|IN|30.75|75.63|1
HYD|Rajiv Gandhi International Airport|Hyderabad|IN|17.23|78.43|1
IAD|Washington Dulles International Airport|Dulles|US|38.94|-77.46|1
IAH|George Bush Intercontinental Airport|Houston|US|29.98|-95.34|1
IAR|Golden Ring Yaroslavl International Airport|Tunoshna|RU|57.56|40.16|1
IAS|Iaşi International Airport|Iaşi|RO|47.18|27.62|1
IBR|Ibaraki Airport|Omitama|JP|36.18|140.41|1
IBZ|Ibiza Airport|Ibiza (Eivissa)|ES|38.87|1.37|1
ICN|Incheon International Airport|Seoul|KR|37.47|126.45|1
IDR|Devi Ahilya Bai Holkar International Airport|Indore|IN|22.72|75.8|1
IFN|Isfahan Shahid Beheshti International Airport|Isfahan|IR|32.76|51.88|1
IGU|Cataratas International Airport|Foz do Iguaçu|BR|-25.59|-54.49|1
IKA|Imam Khomeini International Airport|Tehran|IR|35.42|51.15|1
IKT|Irkutsk International Airport|Irkutsk|RU|52.27|104.4|1
IKU|Issyk-Kul International Airport|Tamchy|KG|42.59|76.7|1
ILO|Iloilo International Airport|Cabatuan|PH|10.83|122.49|1
ILR|General Tunde Idiagbon International Airport|Ilorin/Ogbomosho|NG|8.44|4.49|1
IMF|Bir Tikendrajit International Airport|Imphal|IN|24.76|93.9|1
INC|Yinchuan Hedong International Airport|Yinchuan|CN|38.32|106.39|1
IND|Indianapolis International Airport|Indianapolis|US|39.72|-86.29|1
INI|Niš Constantine the Great Airport|Niš|RS|43.34|21.86|1
INN|Innsbruck Airport|Innsbruck|AT|47.26|11.34|1
IOM|Isle of Man Airport|Castletown|IM|54.08|-4.62|1
IPC|Mataveri International Airport|Isla De Pascua|CL|-27.17|-109.42|1
IPH|Sultan Azlan Shah Airport|Ipoh|MY|4.57|101.09|1
IQQ|Diego Aracena International Airport|Iquique|CL|-20.54|-70.18|1
IQT|Coronel FAP Francisco Secada Vignetta International Airport|Iquitos|PE|-3.78|-73.31|1
ISB|Islamabad International Airport|Attock|PK|33.55|72.83|1
ISK|Nashik International Airport|Nashik|IN|20.12|73.91|1
IST|İstanbul Airport|Istanbul|TR|41.27|28.73|1
ITM|Osaka Itami International Airport|Osaka|JP|34.78|135.44|1
IVL|Ivalo Airport|Ivalo|FI|68.61|27.41|1
IXB|Bagdogra Airport|Siliguri|IN|26.68|88.33|1
IXC|Shaheed Bhagat Singh International Airport|Chandigarh|IN|30.67|76.79|1
IXE|Mangaluru International Airport|Mangaluru|IN|12.95|74.89|1
IXZ|Veer Savarkar International Airport / INS Utkrosh|Port Blair|IN|11.64|92.73|1
JAF|Jaffna International Airport|Jaffna|LK|9.79|80.07|1
JAI|Jaipur International Airport|Jaipur|IN|26.82|75.81|1
JAX|Jacksonville International Airport|Jacksonville|US|30.49|-81.69|1
JCL|České Budějovice South Bohemian Airport|České Budějovice|CZ|48.95|14.43|1
JED|King Abdulaziz International Airport|Jeddah|SA|21.68|39.16|1
JFK|John F. Kennedy International Airport|New York|US|40.64|-73.78|1
JGN|Jiayuguan International Airport|Jiayuguan|CN|39.86|98.34|1
JHB|Senai International Airport|Johor Bahru|MY|1.64|103.67|1
JHG|Xishuangbanna Gasa International Airport|Jinghong (Gasa)|CN|21.97|100.76|1
JIB|Djibouti-Ambouli Airport|Djibouti City|DJ|11.55|43.16|1
JIJ|Gerad Wilwal International Airport|Jijiga|ET|9.33|42.91|1
JJN|Quanzhou Jinjiang International Airport|Quanzhou|CN|24.8|118.59|1
JNB|O.R. Tambo International Airport|Johannesburg|ZA|-26.14|28.25|1
JPA|Presidente Castro Pinto International Airport|João Pessoa|BR|-7.15|-34.95|1
JRO|Kilimanjaro International Airport|Arusha|TZ|-3.43|37.07|1
JTR|Santorini International Airport|Santorini Island|GR|36.4|25.48|1
JUB|Juba International Airport|Juba|SS|4.87|31.6|1
JUJ|Gobernador Horacio Guzman International Airport|San Salvador de Jujuy|AR|-24.39|-65.1|1
JUL|Inca Manco Capac International Airport|Juliaca|PE|-15.47|-70.16|1
KAD|Kaduna International Airport|Kaduna|NG|10.7|7.32|1
KAN|Mallam Aminu Kano International Airport|Kano|NG|12.05|8.52|1
KBL|Kabul International Airport|Kabul|AF|34.57|69.21|1
KBV|Krabi International Airport|Krabi|TH|8.1|98.99|1
KCH|Kuching International Airport|Kuching|MY|1.49|110.35|1
KCZ|Kochi Ryoma Airport|Nankoku|JP|33.55|133.67|1
KDH|Ahmad Shah Baba International Airport|Kandahar|AF|31.51|65.85|1
KDU|Skardu International Airport|Skardu|PK|35.34|75.54|1
KEF|Keflavik International Airport|Reykjavík|IS|63.99|-22.61|1
KEJ|Alexei Leonov Kemerovo International Airport|Kemerovo|RU|55.27|86.11|1
KER|Ayatollah Hashemi Rafsanjani International Airport|Kerman|IR|30.27|56.95|1
KGD|Khrabrovo Airport|Kaliningrad|RU|54.89|20.6|1
KGF|Sary-Arka Airport|Karaganda|KZ|49.67|73.33|1
KGL|Kigali International Airport|Kigali|RW|-1.97|30.14|1
KGS|Kos International Airport "Ippokratis"|Kos Island|GR|36.79|27.09|1
KHG|Kashgar Laining International Airport|Kashgar|CN|39.54|76.02|1
KHH|Kaohsiung International Airport|Kaohsiung (Xiaogang)|TW|22.58|120.35|1
KHI|Jinnah International Airport|Karachi|PK|24.91|67.16|1
KHN|Nanchang Changbei International Airport|Nanchang|CN|28.86|115.9|1
KIH|Kish International Airport|Kish Island|IR|26.53|53.98|1
KIJ|Niigata Airport|Niigata|JP|37.95|139.11|1
KIK|Kirkuk International Airport|Kirkuk|IQ|35.47|44.35|1
KIM|Kimberley Airport|Kimberley|ZA|-28.81|24.76|1
KIN|Norman Manley International Airport|Kingston|JM|17.94|-76.79|1
KIS|Kisumu International Airport|Kisumu|KE|-0.09|34.73|1
KIX|Kansai International Airport|Osaka|JP|34.43|135.24|1
KJA|Krasnoyarsk International Airport|Krasnoyarsk|RU|56.18|92.49|1
KKJ|Kitakyushu Airport|Kitakyushu|JP|33.85|131.04|1
KLO|Kalibo International Airport|Kalibo|PH|11.68|122.38|1
KLU|Klagenfurt Airport|Klagenfurt am Wörthersee|AT|46.64|14.34|1
KLV|Karlovy Vary Airport|Karlovy Vary|CZ|50.2|12.91|1
KMG|Kunming Changshui International Airport|Kunming|CN|25.11|102.94|1
KMI|Miyazaki Airport|Miyazaki|JP|31.88|131.45|1
KMJ|Kumamoto Airport|Kumamoto|JP|32.84|130.85|1
KMQ|Komatsu Airport / JASDF Komatsu Air Base|Kanazawa|JP|36.39|136.41|1
KMS|Prempeh I International Airport|Kumasi|GH|6.71|-1.59|1
KNO|Kualanamu International Airport|Beringin|ID|3.64|98.87|1
KOA|Ellison Onizuka Kona International Airport at Keāhole|Kailua-Kona|US|19.74|-156.05|1
KOJ|Kagoshima Airport|Kagoshima|JP|31.8|130.72|1
KOS|Sihanouk International Airport|Preah Sihanouk|KH|10.57|103.63|1
KOV|Kokshetau International Airport|Kokshetau|KZ|53.33|69.59|1
KQT|Bokhtar International Airport|Bokhtar|TJ|37.87|68.86|1
KRK|Kraków John Paul II International Airport|Balice|PL|50.08|19.78|1
KRN|Kiruna Airport|Kiruna|SE|67.82|20.34|1
KRR|Krasnodar Pashkovsky International Airport|Krasnodar|RU|45.03|39.17|1
KRS|Kristiansand Airport|Kristiansand(Kjevik)|NO|58.2|8.09|1
KRT|Khartoum International Airport|Khartoum|SD|15.59|32.55|1
KSA|Kosrae International Airport|Okat|FM|5.36|162.96|1
KSF|Kassel Airport|Calden|DE|51.42|9.39|1
KSN|Kostanay International Airport|Kostanay|KZ|53.21|63.55|1
KTI|Techo International Airport|Phnom Penh (Boeng Khyang)|KH|11.36|104.92|1
KTM|Tribhuvan International Airport|Kathmandu|NP|27.7|85.36|1
KTT|Kittilä International Airport|Kittilä|FI|67.7|24.85|1
KTW|Katowice Wojciech Korfanty International Airport|Katowice|PL|50.48|19.08|1
KUF|Kurumoch International Airport|Samara|RU|53.5|50.16|1
KUL|Kuala Lumpur International Airport|Sepang|MY|2.75|101.71|1
KUN|Kaunas International Airport|Kaunas|LT|54.96|24.09|1
KUO|Kuopio Airport|Kuopio / Siilinjärvi|FI|63.01|27.8|1
KUT|David the Builder Kutaisi International Airport|Kopitnari|GE|42.18|42.49|1
KVA|Kavala Alexander the Great International Airport|Kavala|GR|40.91|24.62|1
KWE|Guiyang Longdongbao International Airport|Guiyang (Nanming)|CN|26.54|106.8|1
KWI|Kuwait International Airport|Kuwait City|KW|29.22|47.97|1
KWL|Guilin Liangjiang International Airport|Guilin (Lingui)|CN|25.22|110.04|1
KYA|Konya Airport|Konya|TR|37.98|32.56|1
KZN|Kazan International Airport|Kazan|RU|55.61|49.28|1
KZO|Korkyt Ata International Airport|Kyzylorda|KZ|44.71|65.59|1
LAD|Quatro de Fevereiro International Airport|Luanda|AO|-8.86|13.23|1
LAE|Nadzab Tomodachi International Airport|Lae|PG|-6.57|146.73|1
LAO|Laoag International Airport|Laoag City|PH|18.18|120.53|1
LAQ|Al Abraq International Airport|Al Albraq|LY|32.79|21.95|1
LAS|Harry Reid International Airport|Las Vegas|US|36.08|-115.15|1
LAX|Los Angeles International Airport|Los Angeles|US|33.94|-118.41|1
LBA|Leeds Bradford Airport|Leeds, West Yorkshire|GB|53.87|-1.66|1
LBD|Khujand International Airport|Khujand|TJ|40.22|69.69|1
LBV|Libreville Leon M'ba International Airport|Libreville|GA|0.46|9.41|1
LCA|Larnaca International Airport|Larnaca|CY|34.88|33.62|1
LCJ|Łódź Władysław Reymont Airport|Łódź|PL|51.72|19.4|1
LED|Pulkovo Airport|St. Petersburg|RU|59.8|30.26|1
LEJ|Leipzig/Halle Airport|Schkeuditz|DE|51.42|12.23|1
LFW|Lomé–Tokoin International Airport|Lomé|TG|6.17|1.25|1
LGA|LaGuardia Airport|New York|US|40.78|-73.87|1
LGB|Long Beach International Airport|Long Beach|US|33.82|-118.15|1
LGK|Langkawi International Airport|Langkawi|MY|6.33|99.73|1
LGW|London Gatwick Airport|London|GB|51.15|-0.19|1
LHE|Allama Iqbal International Airport|Lahore|PK|31.52|74.4|1
LHR|London Heathrow Airport|London|GB|51.47|-0.46|1
LHW|Lanzhou Zhongchuan International Airport|Lanzhou (Yongdeng)|CN|36.52|103.62|1
LIH|Lihue Airport|Lihue, Kauai|US|21.97|-159.34|1
LIL|Lille Airport|Lesquin|FR|50.57|3.1|1
LIM|Jorge Chávez International Airport|Lima|PE|-12.02|-77.11|1
LIN|Milano Linate Airport|Segrate (MI)|IT|45.45|9.28|1
LIR|Daniel Oduber Quirós International Airport|Liberia|CR|10.59|-85.54|1
LIS|Lisbon Humberto Delgado Airport|Lisbon|PT|38.78|-9.14|1
LJG|Lijiang Sanyi International Airport|Lijiang|CN|26.68|100.24|1
LJU|Ljubljana Jože Pučnik Airport|Zgornji Brnik|SI|46.22|14.46|1
LKO|Chaudhary Charan Singh International Airport|Lucknow|IN|26.76|80.89|1
LLA|Luleå Airport|Luleå|SE|65.54|22.12|1
LLW|Kamuzu International Airport|Lumbadzi|MW|-13.79|33.78|1
LNZ|Linz-Hörsching Airport|Linz|AT|48.24|14.19|1
LOP|Lombok International Airport|Mataram (Pujut, Lombok Tengah)|ID|-8.76|116.28|1
LOS|Murtala Muhammed International Airport|Lagos|NG|6.58|3.32|1
LPA|Gran Canaria Airport|Gran Canaria Island|ES|27.93|-15.39|1
LPB|El Alto International Airport|La Paz / El Alto|BO|-16.51|-68.19|1
LPI|Linköping City Airport|Linköping|SE|58.4|15.68|1
LPL|Liverpool John Lennon Airport|Liverpool|GB|53.33|-2.85|1
LPP|Lappeenranta Airport|Lappeenranta|FI|61.04|28.14|1
LPQ|Luang Phabang International Airport|Luang Phabang|LA|19.9|102.17|1
LRM|Casa De Campo International Airport|La Romana|DO|18.45|-68.91|1
LTN|London Luton Airport|Luton, Luton|GB|51.87|-0.37|1
LTO|Loreto International Airport|Loreto|MX|25.99|-111.35|1
LUN|Kenneth Kaunda International Airport|Lusaka|ZM|-15.33|28.45|1
LUX|Luxembourg-Findel International Airport|Luxembourg|LU|49.63|6.21|1
LUZ|Lublin Airport|Lublin|PL|51.24|22.71|1
LVI|Harry Mwanga Nkumbula International Airport|Livingstone|ZM|-17.82|25.82|1
LWN|Shirak International Airport|Gyumri|AM|40.75|43.86|1
LWO|Lviv International Airport|Lviv|UA|49.81|23.96|1
LXA|Lhasa Gonggar International Airport|Shannan (Gonggar)|CN|29.3|90.91|1
LXR|Luxor International Airport|Luxor|EG|25.67|32.71|1
LYA|Luoyang Beijiao Airport|Luoyang (Laocheng)|CN|34.74|112.39|1
LYG|Lianyungang Huaguoshan International Airport|Lianyungang|CN|34.41|119.18|1
LYP|Faisalabad International Airport|Faisalabad|PK|31.36|73.0|1
LYS|Lyon Saint-Exupéry Airport|Colombier-Saugnieu, Rhône|FR|45.73|5.09|1
MAA|Chennai International Airport|Chennai|IN|12.99|80.17|1
MAD|Adolfo Suárez Madrid–Barajas Airport|Madrid|ES|40.49|-3.57|1
MAH|Menorca Airport|Mahón (Maó)|ES|39.86|4.22|1
MAJ|Marshall Islands International Airport|Majuro Atoll|MH|7.07|171.27|1
MAN|Manchester Airport|Manchester, Greater Manchester|GB|53.35|-2.28|1
MAO|Eduardo Gomes International Airport|Manaus|BR|-3.04|-60.05|1
MAR|La Chinita International Airport|Maracaibo|VE|10.56|-71.73|1
MBA|Moi International Airport|Mombasa|KE|-4.03|39.59|1
MBJ|Sangster International Airport|Montego Bay|JM|18.5|-77.91|1
MCI|Kansas City International Airport|Kansas City|US|39.3|-94.71|1
MCO|Orlando International Airport|Orlando|US|28.43|-81.31|1
MCT|Muscat International Airport|Muscat/Seeb|OM|23.6|58.29|1
MCX|Makhachkala Uytash International Airport|Makhachkala|RU|42.82|47.65|1
MCY|Sunshine Coast Airport|Maroochydore|AU|-26.59|153.08|1
MCZ|Zumbi dos Palmares International Airport|Maceió|BR|-9.51|-35.79|1
MDC|Sam Ratulangi International Airport|Manado|ID|1.55|124.93|1
MDE|Jose Maria Córdova International Airport|Medellín|CO|6.16|-75.42|1
MDL|Mandalay International Airport|Mandalay|MM|21.7|95.98|1
MDW|Chicago Midway International Airport|Chicago|US|41.79|-87.75|1
MDZ|Governor Francisco Gabrielli International Airport|Mendoza|AR|-32.83|-68.79|1
MED|Prince Mohammad Bin Abdulaziz Airport|Medina|SA|24.55|39.71|1
MEL|Melbourne Airport|Melbourne|AU|-37.67|144.84|1
MEM|Frederick W. Smith International Airport|Memphis|US|35.04|-89.98|1
MEX|Mexico City Benito Juárez International Airport|Mexico City|MX|19.44|-99.07|1
MFM|Macau International Airport|Nossa Senhora do Carmo|MO|22.15|113.59|1
MFU|Mfuwe International Airport|Mfuwe|ZM|-13.26|31.94|1
MGA|Augusto C. Sandino (Managua) International Airport|Managua|NI|12.14|-86.17|1
MGQ|Aden Adde International Airport|Mogadishu|SO|2.01|45.3|1
MHD|Mashhad International Airport|Mashhad|IR|36.23|59.64|1
MIA|Miami International Airport|Miami|US|25.8|-80.29|1
MID|Manuel Crescencio Rejón International Airport|Mérida|MX|20.93|-89.65|1
MIU|Maiduguri International Airport|Maiduguri|NG|11.85|13.08|1
MJI|Mitiga International Airport|Tripoli|LY|32.89|13.29|1
MJN|Amborovy Airport|Mahajanga|MG|-15.67|46.35|1
MKE|General Mitchell International Airport|Milwaukee|US|42.95|-87.9|1
MLA|Malta International Airport|Valletta|MT|35.85|14.49|1
MLE|Velana International Airport|Malé|MV|4.19|73.53|1
MLM|General Francisco J. Mujica International Airport|Morelia|MX|19.85|-101.03|1
MMK|Emperor Nicholas II Murmansk Airport|Murmansk|RU|68.78|32.75|1
MMX|Malmö Sturup Airport|Malmö|SE|55.54|13.38|1
MNI|John A. Osborne Airport|Gerald's Park|MS|16.79|-62.19|1
MNL|Ninoy Aquino International Airport|Manila (Pasay)|PH|14.51|121.02|1
MPL|Montpellier-Méditerranée Airport|Montpellier/Méditerranée|FR|43.58|3.96|1
MPM|Maputo Airport|Maputo|MZ|-25.92|32.57|1
MPN|Mount Pleasant Airport / RAF Mount Pleasant|Mount Pleasant|FK|-51.82|-58.45|1
MQF|Magnitogorsk International Airport|Magnitogorsk|RU|53.39|58.76|1
MQP|Kruger Mpumalanga International Airport|Mbombela|ZA|-25.38|31.11|1
MRS|Marseille Provence Airport|Marignane, Bouches-du-Rhône|FR|43.44|5.21|1
MRU|Sir Seewoosagur Ramgoolam International Airport|Plaine Magnien|MU|-20.43|57.68|1
MRV|Mineralnye Vody Airport|Mineralnyye Vody|RU|44.23|43.08|1
MSP|Minneapolis–Saint Paul International Airport / Wold–Chamberlain Field|Minneapolis|US|44.88|-93.22|1
MSQ|Minsk National Airport|Minsk|BY|53.89|28.04|1
MST|Maastricht Aachen Airport|Maastricht|NL|50.91|5.77|1
MSU|Moshoeshoe I International Airport|Maseru(Mazenod)|LS|-29.46|27.55|1
MSY|Louis Armstrong New Orleans International Airport|New Orleans|US|29.99|-90.26|1
MTY|Monterrey International Airport|Monterrey|MX|25.78|-100.11|1
MUB|Maun International Airport|Maun|BW|-19.97|23.43|1
MUC|Munich Airport|Munich|DE|48.35|11.79|1
MUH|Mersa Matruh International Airport|Marsa Matruh|EG|31.32|27.22|1
MUX|Multan International Airport|Multan|PK|30.2|71.42|1
MVD|Carrasco General Cesáreo L. Berisso International Airport|Ciudad de la Costa|UY|-34.84|-56.03|1
MWX|Muan International Airport|Muan (Piseo-ri)|KR|34.99|126.38|1
MWZ|Mwanza International Airport|Mwanza|TZ|-2.45|32.94|1
MXP|Milan Malpensa International Airport|Ferno (VA)|IT|45.63|8.73|1
MYJ|Matsuyama Airport|Matsuyama|JP|33.83|132.7|1
MYR|Myrtle Beach International Airport|Myrtle Beach|US|33.68|-78.93|1
MZG|Penghu Magong Airport|Huxi|TW|23.57|119.63|1
MZR|Mazar-i-Sharif International Airport|Mazar-i-Sharif|AF|36.7|67.21|1
MZT|General Rafael Buelna International Airport|Mazatlàn|MX|23.16|-106.26|1
NAG|Dr. Babasaheb Ambedkar International Airport|Nagpur|IN|21.09|79.05|1
NAJ|Nakhchivan International Airport|Nakhchivan|AZ|39.19|45.46|1
NAN|Nadi International Airport|Nadi|FJ|-17.76|177.44|1
NAP|Naples International Airport|Napoli|IT|40.89|14.29|1
NAS|Lynden Pindling International Airport|Nassau|BS|25.04|-77.47|1
NAT|Rio Grande do Norte/São Gonçalo do Amarante–Governador Aluízio Alves International Airport|Natal|BR|-5.77|-35.37|1
NAV|Nevşehir Kapadokya Airport|Nevşehir|TR|38.77|34.53|1
NBJ|Dr. Antonio Agostinho Neto International Airport|Luanda (Ícolo e Bengo)|AO|-9.05|13.5|1
NBO|Jomo Kenyatta International Airport|Nairobi|KE|-1.32|36.93|1
NCE|Nice-Côte d'Azur Airport|Nice, Alpes-Maritimes|FR|43.66|7.22|1
NCL|Newcastle International Airport|Newcastle upon Tyne, Tyne and Wear|GB|55.04|-1.69|1
NCU|Nukus International Airport|Nukus|UZ|42.49|59.62|1
NDB|Nouadhibou International Airport|Nouadhibou|MR|20.93|-17.03|1
NDG|Qiqihar Sanjiazi Airport|Qiqihar|CN|47.23|123.91|1
NDJ|N'Djamena International Airport|N'Djamena|TD|12.13|15.03|1
NDR|Nador Al Aaroui International Airport|Al Aaroui|MA|34.99|-3.03|1
NGB|Ningbo Lishe International Airport|Ningbo|CN|29.83|121.46|1
NGO|Chubu Centrair International Airport|Tokoname|JP|34.86|136.8|1
NGS|Nagasaki Airport|Nagasaki|JP|32.92|129.91|1
NIM|Diori Hamani International Airport|Niamey|NE|13.48|2.18|1
NJC|Nizhnevartovsk Airport|Nizhnevartovsk|RU|60.95|76.48|1
NJF|Al Najaf International Airport|Najaf|IQ|31.99|44.41|1
NKC|Nouakchott–Oumtounsy International Airport|Nouakchott|MR|18.31|-15.97|1
NKG|Nanjing Lukou International Airport|Nanjing|CN|31.74|118.87|1
NLA|Simon Mwansa Kapwepwe International Airport|Ndola|ZM|-12.97|28.52|1
NLU|Felipe Ángeles International Airport|Mexico City|MX|19.74|-99.02|1
NMA|Namangan International Airport|Namangan|UZ|40.98|71.56|1
NMI|Navi Mumbai International Airport|Navi Mumbai|IN|18.98|73.07|1
NNG|Nanning Wuxu International Airport|Nanning (Jiangnan)|CN|22.6|108.18|1
NOC|Ireland West Airport Knock|Charlestown|IE|53.91|-8.82|1
NOS|Nosy Be International Airport|Nosy Be|MG|-13.31|48.31|1
NOU|La Tontouta International Airport|Nouméa (La Tontouta)|NC|-22.01|166.21|1
NQN|Presidente Perón International Airport|Neuquén|AR|-38.95|-68.16|1
NQZ|Nursultan Nazarbayev International Airport|Astana|KZ|51.03|71.47|1
NRN|Weeze (Niederrhein) Airport|Weeze|DE|51.6|6.14|1
NRT|Narita International Airport|Narita|JP|35.77|140.39|1
NSI|Yaoundé Nsimalen International Airport|Yaoundé|CM|3.72|11.55|1
NSK|Alykel International Airport|Norilsk|RU|69.31|87.33|1
NTE|Nantes Atlantique Airport|Nantes|FR|47.15|-1.61|1
NTL|Newcastle Airport|Williamtown|AU|-32.8|151.84|1
NUE|Nuremberg Airport|Nuremberg|DE|49.5|11.08|1
NUM|Neom Bay Airport|Sharma|SA|27.92|35.29|1
NVT|Ministro Victor Konder International Airport|Navegantes|BR|-26.88|-48.65|1
NYO|Stockholm Skavsta Airport|Nyköping|SE|58.79|16.91|1
NYT|Nay Pyi Taw International Airport|Naypyitaw|MM|19.62|96.2|1
OAK|Oakland San Francisco Bay Airport|Oakland|US|37.72|-122.22|1
OAX|Xoxocotlán International Airport|Oaxaca|MX|17.0|-96.73|1
OCS|Corisco International Airport|Corisco Island|GQ|0.91|9.33|1
ODE|Odense Hans Christian Andersen Airport|Odense|DK|55.48|10.33|1
OEC|Oecusse Route of the Sandalwood International Airport|Oecussi-Ambeno|TL|-9.2|124.34|1
OGG|Kahului International Airport|Kahului|US|20.9|-156.43|1
OHD|Ohrid St. Paul the Apostle Airport|Ohrid|MK|41.18|20.74|1
OHS|Suhar International Airport|Suhar|OM|24.39|56.63|1
OKA|Naha International Airport|Naha|JP|26.19|127.64|1
OKC|OKC Will Rogers World Airport|Oklahoma City|US|35.39|-97.6|1
OKJ|Okayama Momotaro Airport|Okayama|JP|34.76|133.85|1
OLB|Olbia Costa Smeralda Airport|Olbia (SS)|IT|40.9|9.52|1
OMA|Eppley Airfield|Omaha|US|41.3|-95.89|1
OMO|Mostar International Airport|Mostar|BA|43.28|17.85|1
OMR|Oradea International Airport|Oradea|RO|47.03|21.9|1
OMS|Omsk Central Airport|Omsk|RU|54.96|73.31|1
ONT|Ontario International Airport|Ontario|US|34.06|-117.6|1
OOL|Gold Coast Airport|Gold Coast|AU|-28.17|153.51|1
OPO|Francisco de Sá Carneiro Airport|Porto|PT|41.25|-8.68|1
ORD|Chicago O'Hare International Airport|Chicago|US|41.98|-87.9|1
ORF|Norfolk International Airport|Norfolk|US|36.9|-76.2|1
ORK|Cork International Airport|Cork|IE|51.84|-8.49|1
ORN|Oran Es-Sénia (Ahmed Ben Bella) International Airport|Es-Sénia|DZ|35.62|-0.62|1
ORU|Juan Mendoza International Airport|Oruro|BO|-17.96|-67.08|1
ORY|Paris-Orly Airport|Paris (Orly, Val-de-Marne)|FR|48.73|2.36|1
OSL|Oslo-Gardermoen International Airport|Oslo (Gardermoen)|NO|60.19|11.1|1
OSR|Leoš Janáček Airport Ostrava|Mošnov|CZ|49.7|18.11|1
OSS|Osh International Airport|Osh|KG|40.61|72.79|1
OST|Ostend-Bruges International Airport|Oostende|BE|51.2|2.87|1
OTP|Bucharest Henri Coandă International Airport|Otopeni|RO|44.57|26.1|1
OUA|Ouagadougou Thomas Sankara International Airport|Ouagadougou|BF|12.35|-1.51|1
OUD|Oujda Angads Airport|Ahl Angad|MA|34.79|-1.93|1
OUL|Oulu Airport|Oulu / Oulunsalo|FI|64.93|25.35|1
OVB|Novosibirsk Tolmachevo Airport|Novosibirsk|RU|55.02|82.62|1
OVD|Asturias Airport|Ranón|ES|43.56|-6.03|1
OXB|Osvaldo Vieira International Airport|Bissau|GW|11.89|-15.65|1
OZG|Zagora Airport|Zagora|MA|30.27|-5.86|1
OZZ|Ouarzazate International Airport|Ouarzazate|MA|30.94|-6.91|1
PAD|Paderborn Lippstadt Airport|Büren|DE|51.61|8.62|1
PAP|Toussaint Louverture International Airport|Port-au-Prince|HT|18.58|-72.29|1
PBC|Hermanos Serdán International Airport|Puebla|MX|19.16|-98.37|1
PBH|Paro International Airport|Paro|BT|27.4|89.42|1
PBM|Johan Adolf Pengel International Airport|Paramaribo|SR|5.45|-55.19|1
PCL|Cap FAP David Abenzur Rengifo International Airport|Pucallpa|PE|-8.38|-74.57|1
PDG|Minangkabau International Airport|Padang (Katapiang)|ID|-0.79|100.28|1
PDL|João Paulo II Airport|Ponta Delgada|PT|37.74|-25.7|1
PDV|Plovdiv International Airport|Plovdiv|BG|42.07|24.85|1
PDX|Portland International Airport|Portland|US|45.59|-122.6|1
PED|Pardubice Airport|Pardubice|CZ|50.02|15.74|1
PEE|Perm International Airport|Perm|RU|57.91|56.02|1
PEG|Perugia San Francesco d'Assisi – Umbria International Airport|Perugia (PG)|IT|43.1|12.51|1
PEK|Beijing Capital International Airport|Beijing|CN|40.08|116.6|1
PEN|Penang International Airport|Penang|MY|5.3|100.28|1
PER|Perth International Airport|Perth|AU|-31.94|115.97|1
PEV|Pécs-Pogány International Airport|Pécs|HU|45.99|18.24|1
PEW|Bacha Khan International Airport|Peshawar|PK|33.99|71.51|1
PFO|Paphos International Airport|Paphos|CY|34.72|32.49|1
PHC|Port Harcourt International Airport|Port Harcourt|NG|5.02|6.95|1
PHE|Port Hedland International Airport|Port Hedland|AU|-20.38|118.63|1
PHH|Pokhara International Airport|Pokhara|NP|28.18|84.01|1
PHL|Philadelphia International Airport|Philadelphia|US|39.87|-75.24|1
PHX|Phoenix Sky Harbor International Airport|Phoenix|US|33.44|-112.01|1
PIE|St. Petersburg Clearwater International Airport|Pinellas Park|US|27.91|-82.69|1
PIK|Glasgow Prestwick Airport|Prestwick, South Ayrshire|GB|55.5|-4.58|1
PIT|Pittsburgh International Airport|Pittsburgh|US|40.49|-80.23|1
PKC|Yelizovo Airport|Petropavlovsk-Kamchatsky|RU|53.17|158.45|1
PKX|Beijing Daxing International Airport|Beijing|CN|39.5|116.41|1
PKZ|Pakse International Airport|Pakse|LA|15.13|105.78|1
PLQ|Palanga International Airport|Palanga|LT|55.97|21.09|1
PLS|Providenciales International Airport|Providenciales|TC|21.77|-72.27|1
PLX|Semei International Airport|Semey|KZ|50.35|80.23|1
PLZ|Chief Dawid Stuurman International Airport|Gqeberha (Port Elizabeth)|ZA|-33.99|25.62|1
PMC|El Tepual International Airport|Puerto Montt|CL|-41.44|-73.09|1
PMI|Palma de Mallorca Airport|Palma de Mallorca|ES|39.55|2.74|1
PMO|Falcone–Borsellino Airport|Palermo|IT|38.18|13.09|1
PMV|Del Caribe Santiago Mariño International Airport|Isla Margarita|VE|10.91|-63.97|1
PNK|Supadio International Airport|Pontianak|ID|-0.15|109.4|1
PNQ|Pune International Airport|Pune|IN|18.58|73.92|1
PNR|Antonio Agostinho-Neto International Airport|Pointe Noire|CG|-4.82|11.89|1
PNS|Pensacola International Airport|Pensacola|US|30.47|-87.19|1
POA|Porto Alegre-Salgado Filho International Airport|Porto Alegre|BR|-29.99|-51.17|1
POG|Port Gentil International Airport|Port Gentil|GA|-0.71|8.75|1
POM|Port Moresby Jacksons International Airport|Port Moresby|PG|-9.44|147.22|1
POS|Piarco International Airport|Port of Spain|TT|10.6|-61.34|1
POZ|Poznań-Ławica Airport|Poznań|PL|52.42|16.82|1
PPG|Pago Pago International Airport|Pago Pago|AS|-14.33|-170.71|1
PPK|Petropavl International Airport|Petropavl|KZ|54.78|69.19|1
PPS|Puerto Princesa International Airport / PAF Antonio Bautista Air Base|Puerto Princesa|PH|9.74|118.76|1
PPT|Fa'a'ā International Airport|Papeete|PF|-17.55|-149.61|1
PQC|Phú Quốc International Airport|Phu Quoc Island|VN|10.17|103.99|1
PRG|Václav Havel Airport Prague|Prague|CZ|50.1|14.26|1
PRN|Priština Adem Jashari International Airport|Prishtina|XK|42.57|21.04|1
PSA|Pisa International Airport|Pisa (PI)|IT|43.68|10.39|1
PSD|Port Said International Airport|Port Said|EG|31.28|32.24|1
PSP|Palm Springs International Airport|Palm Springs|US|33.83|-116.51|1
PSR|Abruzzo Airport|Pescara|IT|42.43|14.18|1
PTG|Polokwane International Airport|Polokwane|ZA|-23.85|29.46|1
PTP|Maryse Condé International Airport|Pointe-à-Pitre|GP|16.27|-61.53|1
PTY|Tocumen International Airport|Tocumen|PA|9.07|-79.38|1
PUJ|Punta Cana International Airport|Punta Cana|DO|18.57|-68.36|1
PUQ|President Carlos Ibáñez International Airport|Punta Arenas|CL|-53.0|-70.85|1
PUS|Gimhae International Airport|Busan|KR|35.18|128.94|1
PUY|Pula Airport|Pula|HR|44.89|13.92|1
PVD|Rhode Island T. F. Green International Airport|Providence/Warwick|US|41.73|-71.43|1
PVG|Shanghai Pudong International Airport|Shanghai (Pudong)|CN|31.14|121.81|1
PVH|Governador Jorge Teixeira de Oliveira International Airport|Porto Velho|BR|-8.71|-63.9|1
PVR|Puerto Vallarta International Airport|Puerto Vallarta|MX|20.68|-105.25|1
PWM|Portland International Jetport|Portland|US|43.65|-70.31|1
PWQ|Pavlodar International Airport|Pavlodar|KZ|52.19|77.07|1
PYK|Payam International Airport|Karaj|IR|35.78|50.83|1
PZO|General Manuel Carlos Piar International Airport|Guyana City|VE|8.29|-62.76|1
PZU|Port Sudan New International Airport|Port Sudan|SD|19.43|37.23|1
QRO|Querétaro Intercontinental Airport|Querétaro|MX|20.62|-100.19|1
RAI|Nelson Mandela International Airport|Praia|CV|14.94|-23.48|1
RAK|Marrakesh Menara Airport|Marrakesh|MA|31.6|-8.04|1
RAR|Rarotonga International Airport|Avarua|CK|-21.2|-159.81|1
RBA|Rabat-Salé Airport|Rabat|MA|34.05|-6.75|1
RBR|Rio Branco-Plácido de Castro International Airport|Rio Branco|BR|-9.87|-67.89|1
RDU|Raleigh-Durham International Airport|Raleigh/Durham|US|35.88|-78.79|1
REC|Recife/Guararapes - Gilberto Freyre International Airport|Recife|BR|-8.13|-34.92|1
RES|Resistencia International Airport|Resistencia|AR|-27.45|-59.06|1
REU|Reus Airport|Reus|ES|41.15|1.17|1
RGL|Piloto Civil Norberto Fernández International Airport|Rio Gallegos|AR|-51.61|-69.31|1
RGN|Yangon International Airport|Yangon|MM|16.91|96.13|1
RHO|Rhodes International Airport "Diagoras"|Rhodes|GR|36.41|28.09|1
RIC|Richmond International Airport|Richmond|US|37.51|-77.32|1
RIX|Riga International Airport|Riga|LV|56.92|23.97|1
RIY|Riyan International Airport|Mukalla(Riyan)|YE|14.66|49.38|1
RJK|Rijeka Airport|Rijeka(Omišalj)|HR|45.22|14.57|1
RKT|Ras Al Khaimah International Airport|Ras Al Khaimah|AE|25.61|55.94|1
RKZ|Xigaze Peace Airport / Shigatse Air Base|Xigazê (Samzhubzê)|CN|29.35|89.3|1
RMF|Marsa Alam International Airport|Marsa Alam|EG|25.56|34.59|1
RMI|Federico Fellini International Airport|Rimini (RN)|IT|44.02|12.61|1
RML|Colombo Ratmalana International Airport|Colombo|LK|6.82|79.89|1
RMO|Chişinău International Airport|Chişinău|MD|46.93|28.93|1
RMQ|Taichung International Airport / Ching Chuang Kang Air Base|Taichung (Qingshui)|TW|24.26|120.62|1
RMU|Region of Murcia International Airport|Corvera|ES|37.8|-1.12|1
RNO|Reno Tahoe International Airport|Reno|US|39.5|-119.77|1
ROB|Roberts International Airport|Monrovia|LR|6.23|-10.36|1
ROC|Frederick Douglass Greater Rochester International Airport|Rochester|US|43.12|-77.67|1
ROP|Rota International Airport|Rota Island|MP|14.17|145.24|1
ROR|Roman Tmetuchl International Airport|Babelthuap Island|PW|7.37|134.54|1
ROS|Rosario Islas Malvinas International Airport|Rosario|AR|-32.9|-60.78|1
ROV|Platov International Airport|Rostov-on-Don|RU|47.49|39.92|1
RSI|Red Sea International Airport|Hanak|SA|25.63|37.09|1
RSW|Southwest Florida International Airport|Fort Myers|US|26.53|-81.75|1
RTB|Juan Manuel Gálvez International Airport|Coxen Hole|HN|16.32|-86.52|1
RTM|Rotterdam The Hague Airport|Rotterdam|NL|51.96|4.44|1
RUH|King Khalid International Airport|Riyadh|SA|24.96|46.7|1
RUN|Roland Garros Airport|Sainte-Marie|RE|-20.89|55.52|1
RVN|Rovaniemi Airport|Rovaniemi|FI|66.56|25.83|1
RZE|Rzeszów-Jasionka Airport|Jasionka|PL|50.11|22.02|1
RZV|Rize–Artvin Airport|Rize|TR|41.18|40.85|1
SAG|Shirdi International Airport|Kakadi|IN|19.69|74.37|1
SAH|Sanaa International Airport|Sanaa|YE|15.48|44.22|1
SAI|Siem Reap-Angkor International Airport|Siem Reap|KH|13.37|104.22|1
SAL|El Salvador International Airport Saint Óscar Arnulfo Romero y Galdámez|San Salvador (San Luis Talpa)|SV|13.44|-89.06|1
SAN|San Diego International Airport|San Diego|US|32.73|-117.19|1
SAP|Ramón Villeda Morales International Airport|San Pedro Sula|HN|15.45|-87.92|1
SAT|San Antonio International Airport|San Antonio|US|29.53|-98.47|1
SAV|Savannah Hilton Head International Airport|Savannah|US|32.13|-81.2|1
SAW|Istanbul Sabiha Gökçen International Airport|Pendik, Istanbul|TR|40.9|29.31|1
SBD|San Bernardino International Airport|San Bernardino|US|34.1|-117.24|1
SBZ|Sibiu International Airport|Sibiu|RO|45.79|24.09|1
SCL|Comodoro Arturo Merino Benítez International Airport|Santiago|CL|-33.39|-70.79|1
SCO|Aktau International Airport|Aktau|KZ|43.86|51.09|1
SCQ|Santiago-Rosalía de Castro Airport|Santiago de Compostela|ES|42.9|-8.42|1
SCR|Scandinavian Mountains Airport|Malung-Sälen|SE|61.17|12.83|1
SCU|Antonio Maceo International Airport|Santiago|CU|19.97|-75.84|1
SCV|Suceava Ștefan cel Mare International Airport|Suceava|RO|47.69|26.35|1
SDF|Louisville Muhammad Ali International Airport|Louisville|US|38.17|-85.74|1
SDJ|Sendai Airport|Natori|JP|38.14|140.92|1
SDQ|Las Américas International Airport|Santo Domingo|DO|18.43|-69.67|1
SDU|Santos Dumont Airport|Rio de Janeiro|BR|-22.91|-43.16|1
SEA|Seattle–Tacoma International Airport|Seattle|US|47.45|-122.31|1
SEZ|Seychelles International Airport|Victoria|SC|-4.67|55.52|1
SFB|Orlando Sanford International Airport|Orlando|US|28.77|-81.23|1
SFO|San Francisco International Airport|San Francisco|US|37.62|-122.37|1
SFS|Subic Bay International Airport / Naval Air Station Cubi Point|Olongapo|PH|14.79|120.27|1
SGC|Surgut International Airport|Surgut|RU|61.34|73.41|1
SGN|Tan Son Nhat International Airport|Ho Chi Minh City|VN|10.82|106.65|1
SHA|Shanghai Hongqiao International Airport|Shanghai (Minhang)|CN|31.2|121.33|1
SHE|Shenyang Taoxian International Airport|Shenyang|CN|41.64|123.48|1
SHJ|Sharjah International Airport|Sharjah|AE|25.33|55.52|1
SHO|King Mswati III International Airport|Mpaka|SZ|-26.36|31.72|1
SID|Amílcar Cabral International Airport|Espargos|CV|16.74|-22.95|1
SIN|Singapore Changi Airport|Singapore|SG|1.35|103.99|1
SIP|Simferopol International Airport|Simferopol|UA|45.05|33.98|1
SJC|Mineta San Jose International Airport|San Jose|US|37.36|-121.93|1
SJD|Los Cabos International Airport|San José del Cabo|MX|23.15|-109.72|1
SJJ|Sarajevo International Airport|Sarajevo|BA|43.82|18.33|1
SJO|Juan Santamaría International Airport|San José (Alajuela)|CR|9.99|-84.21|1
SJU|Luis Munoz Marin International Airport|San Juan|PR|18.44|-66.0|1
SJW|Shijiazhuang Zhengding International Airport|Shijiazhuang|CN|38.28|114.7|1
SKB|Robert L. Bradshaw International Airport|Basseterre|KN|17.31|-62.72|1
SKD|Samarkand International Airport|Samarkand|UZ|39.7|66.98|1
SKG|Thessaloniki Macedonia International Airport|Thessaloniki|GR|40.52|22.97|1
SKO|Sadiq Abubakar III International Airport|Sokoto|NG|12.92|5.21|1
SKP|Skopje International Airport|Ilinden|MK|41.96|21.62|1
SKT|Sialkot International Airport|Sialkot|PK|32.54|74.36|1
SKX|Saransk International Airport|Saransk|RU|54.13|45.21|1
SLA|Martín Miguel de Güemes International Airport|Salta|AR|-24.86|-65.49|1
SLC|Salt Lake City International Airport|Salt Lake City|US|40.79|-111.98|1
SLL|Salalah International Airport|Salalah|OM|17.04|54.09|1
SLZ|Marechal Cunha Machado International Airport|São Luís|BR|-2.59|-44.24|1
SMF|Sacramento International Airport|Sacramento|US|38.7|-121.59|1
SNA|John Wayne Orange County International Airport|Santa Ana|US|33.68|-117.87|1
SNC|General Ulpiano Paez International Airport|Salinas/La Libertad|EC|-2.21|-80.99|1
SNN|Shannon Airport|Shannon|IE|52.7|-8.92|1
SNU|Abel Santamaria International Airport|Santa Clara|CU|22.49|-79.94|1
SOC|Adisoemarmo International Airport|Surakarta|ID|-7.52|110.76|1
SOF|Sofia Airport|Sofia|BG|42.7|23.42|1
SPU|Split Saint Jerome Airport|Split|HR|43.54|16.3|1
SPX|Sphinx International Airport|Al Jiza|EG|30.11|30.9|1
SRE|Alcantarí International Airport|Sucre|BO|-19.25|-65.15|1
SRG|Jenderal Ahmad Yani Airport|Semarang|ID|-6.97|110.37|1
SRQ|Sarasota Bradenton International Airport|Sarasota/Bradenton|US|27.39|-82.55|1
SSA|Deputado Luiz Eduardo Magalhães International Airport|Salvador|BR|-12.91|-38.32|1
SSG|Malabo International Airport|Malabo|GQ|3.76|8.71|1
SSH|Sharm El Sheikh International Airport|Sharm El Sheikh|EG|27.98|34.39|1
STI|Cibao International Airport|Santiago|DO|19.4|-70.6|1
STL|St. Louis Lambert International Airport|St Louis|US|38.75|-90.37|1
STN|London Stansted Airport|London, Essex|GB|51.88|0.23|1
STR|Stuttgart Airport|Stuttgart|DE|48.69|9.22|1
STT|Cyril E. King Airport|Charlotte Amalie|VI|18.34|-64.98|1
STV|Surat International Airport|Surat|IN|21.12|72.74|1
SUB|Juanda International Airport|Surabaya|ID|-7.38|112.79|1
SUF|Lamezia Terme Sant'Eufemia International Airport|Lamezia Terme (CZ)|IT|38.91|16.25|1
SUV|Nausori International Airport|Nausori|FJ|-18.04|178.56|1
SVD|Argyle International Airport|Kingstown|VC|13.16|-61.15|1
SVG|Stavanger Airport, Sola|Stavanger|NO|58.88|5.64|1
SVO|Sheremetyevo International Airport|Moscow|RU|55.98|37.41|1
SVQ|Seville Airport|Seville|ES|37.42|-5.89|1
SVX|Koltsovo Airport|Yekaterinburg|RU|56.74|60.8|1
SWA|Jieyang Chaoshan International Airport|Jieyang (Rongcheng)|CN|23.55|116.5|1
SXB|Strasbourg Airport|Strasbourg|FR|48.54|7.63|1
SXM|Princess Juliana International Airport|Sint Maarten|SX|18.04|-63.11|1
SXR|Srinagar International Airport|Srinagar|IN|33.99|74.77|1
SYD|Sydney Kingsford Smith International Airport|Sydney (Mascot)|AU|-33.95|151.18|1
SYR|Syracuse Hancock International Airport|Syracuse|US|43.11|-76.11|1
SYX|Sanya Phoenix International Airport|Sanya (Tianya)|CN|18.3|109.41|1
SYZ|Shiraz Shahid Dastghaib International Airport|Shiraz|IR|29.54|52.59|1
SZB|Sultan Abdul Aziz Shah International Airport|Subang|MY|3.13|101.55|1
SZG|Salzburg Airport|Salzburg|AT|47.79|13.0|1
SZX|Shenzhen Bao'an International Airport|Shenzhen|CN|22.64|113.8|1
SZZ|Solidarity Szczecin–Goleniów Airport|Szczecin(Glewice)|PL|53.58|14.9|1
TAB|A.N.R. Robinson International Airport|Scarborough|TT|11.15|-60.83|1
TAE|Daegu International Airport|Daegu|KR|35.89|128.66|1
TAG|Bohol-Panglao International Airport|Panglao|PH|9.57|123.77|1
TAK|Takamatsu Airport|Takamatsu|JP|34.21|134.02|1
TAO|Qingdao Jiaodong International Airport|Qingdao (Jiaozhou)|CN|36.36|120.09|1
TAS|Tashkent International Airport|Tashkent|UZ|41.26|69.28|1
TAZ|Dashoguz International Airport|Daşoguz|TM|41.76|59.84|1
TBS|Tbilisi International Airport|Tbilisi|GE|41.67|44.95|1
TBU|Fua'amotu International Airport|Nuku'alofa|TO|-21.24|-175.15|1
TBZ|Tabriz International Airport|Tabriz|IR|38.13|46.24|1
TET|Tete Airport|Tete|MZ|-16.1|33.64|1
TFN|Tenerife Norte-Ciudad de La Laguna Airport|Tenerife|ES|28.48|-16.34|1
TFS|Tenerife Sur Airport|Tenerife|ES|28.04|-16.57|1
TFU|Chengdu Tianfu International Airport|Chengdu (Jianyang)|CN|30.31|104.44|1
TGD|Podgorica Airport / Podgorica Golubovci Airbase|Podgorica|ME|42.36|19.25|1
THR|Mehrabad International Airport|Tehran|IR|35.69|51.31|1
TIA|Tirana International Airport Mother Teresa|Rinas|AL|41.41|19.72|1
TIF|Taif International Airport|Taif|SA|21.48|40.54|1
TIJ|General Abelardo L. Rodriguez International Airport|Tijuana|MX|32.54|-116.97|1
TIR|Tirupati International Airport|Tirupati|IN|13.63|79.54|1
TJM|Roshchino International Airport|Tyumen|RU|57.18|65.33|1
TJU|Kulob International Airport|Kulob|TJ|37.99|69.81|1
TKK|Chuuk International Airport|Weno Island|FM|7.46|151.84|1
TKS|Tokushima Awaodori Airport / JMSDF Tokushima Air Base|Tokushima|JP|34.13|134.61|1
TKU|Turku Airport|Turku|FI|60.51|22.26|1
TLC|Adolfo López Mateos International Airport|Toluca|MX|19.34|-99.57|1
TLL|Lennart Meri Tallinn Airport|Tallinn|EE|59.41|24.83|1
TLM|Zenata – Messali El Hadj Airport|Zenata|DZ|35.01|-1.46|1
TLS|Toulouse-Blagnac Airport|Toulouse/Blagnac|FR|43.63|1.36|1
TLV|Ben Gurion International Airport|Tel Aviv|IL|32.01|34.89|1
TML|Yakubu Tali International Airport|Tamale|GH|9.55|-0.87|1
TMM|Toamasina Ambalamanasy Airport|Toamasina|MG|-18.11|49.39|1
TMP|Tampere-Pirkkala Airport|Tampere / Pirkkala|FI|61.41|23.6|1
TMR|Aguenar – Hadj Bey Akhamok Airport|Tamanrasset|DZ|22.81|5.45|1
TMS|São Tomé International Airport|São Tomé|ST|0.38|6.71|1
TNA|Jinan Yaoqiang International Airport|Jinan (Licheng)|CN|36.86|117.22|1
TNG|Tangier Ibn Battuta Airport|Tangier|MA|35.73|-5.92|1
TNN|Tainan International Airport / Tainan Air Base|Tainan (Rende)|TW|22.95|120.21|1
TNR|Ivato International Airport|Antananarivo|MG|-18.8|47.48|1
TOF|Tomsk Kamov Airport|Tomsk|RU|56.38|85.21|1
TOM|Tombouktou Airport|Timbuktu|ML|16.73|-3.01|1
TOS|Tromsø Airport|Tromsø|NO|69.68|18.92|1
TPA|Tampa International Airport|Tampa|US|27.98|-82.53|1
TPE|Taiwan Taoyuan International Airport|Taoyuan|TW|25.08|121.23|1
TQO|Felipe Carrillo Puerto International Airport Tulum|Tulum|MX|20.17|-87.66|1
TRD|Trondheim Airport, Værnes|Trondheim|NO|63.46|10.92|1
TRF|Sandefjord Airport, Torp|Sandefjord(Torp)|NO|59.19|10.26|1
TRN|Turin Airport|Caselle Torinese (TO)|IT|45.2|7.65|1
TRS|Trieste Airport|Ronchi dei Legionari/Trieste|IT|45.83|13.47|1
TRU|Capitán FAP Carlos Martínez de Pinillos International Airport|Trujillo|PE|-8.08|-79.11|1
TRV|Thiruvananthapuram International Airport|Thiruvananthapuram|IN|8.48|76.92|1
TRW|Bonriki International Airport|South Tarawa|KI|1.38|173.15|1
TRZ|Tiruchirappalli International Airport|Tiruchirappalli|IN|10.76|78.72|1
TSA|Taipei Songshan International Airport|Taipei (Songshan)|TW|25.07|121.55|1
TSF|Treviso Airport|Treviso (TV)|IT|45.65|12.19|1
TSN|Tianjin Binhai International Airport|Tianjin|CN|39.12|117.35|1
TSR|Timișoara Traian Vuia International Airport|Timişoara|RO|45.81|21.34|1
TTU|Sania Ramel Airport|Tétouan|MA|35.59|-5.32|1
TUC|Teniente Benjamín Matienzo International Airport|San Miguel de Tucumán|AR|-26.84|-65.1|1
TUK|Turbat International Airport|Turbat|PK|25.98|63.03|1
TUL|Tulsa International Airport|Tulsa|US|36.2|-95.89|1
TUN|Tunis Carthage International Airport|Tunis|TN|36.85|10.23|1
TUS|Tucson International Airport|Tucson|US|32.12|-110.94|1
TUU|Prince Sultan bin Abdulaziz International Airport|Tabuk|SA|28.37|36.62|1
TXN|Huangshan Tunxi International Airport|Huangshan|CN|29.73|118.26|1
TYN|Taiyuan Wusu International Airport|Taiyuan|CN|37.75|112.63|1
TYS|McGhee Tyson Airport|Knoxville/Maryville|US|35.81|-83.99|1
TZL|Tuzla International Airport|Dubrave Gornje|BA|44.46|18.72|1
UBN|Ulaanbaatar Chinggis Khaan International Airport|Ulaanbaatar (Sergelen)|MN|47.65|106.82|1
UET|Quetta International Airport|Quetta|PK|30.25|66.94|1
UFA|Ufa International Airport|Ufa|RU|54.56|55.87|1
UGC|Urgench International Airport|Urgench|UZ|41.58|60.64|1
UIO|Mariscal Sucre International Airport|Quito|EC|-0.13|-78.35|1
UKB|Kobe Airport|Kobe|JP|34.63|135.22|1
UKK|Oskemen International Airport|Ust-Kamenogorsk (Oskemen)|KZ|50.04|82.5|1
ULH|Al-Ula International Airport|Al-Ula|SA|26.48|38.12|1
UME|Umeå Airport|Umeå|SE|63.79|20.28|1
UPG|Sultan Hasanuddin International Airport|Makassar|ID|-5.08|119.55|1
URA|Manshuk Mametova International Airport|Uralsk|KZ|51.15|51.54|1
URC|Ürümqi Tianshan International Airport|Ürümqi|CN|43.91|87.48|1
USM|Samui International Airport|Na Thon (Ko Samui Island)|TH|9.55|100.06|1
UTH|Udon Thani International Airport|Udon Thani|TH|17.39|102.79|1
UTP|U-Tapao–Rayong–Pattaya International Airport|Rayong|TH|12.68|101.0|1
UUD|Baikal International Airport|Ulan Ude|RU|51.81|107.44|1
UUS|Yuzhno-Sakhalinsk International Airport|Yuzhno-Sakhalinsk|RU|46.89|142.72|1
UVF|Hewanorra International Airport|Vieux Fort|LC|13.73|-60.95|1
UYU|Joya Andina International Airport|Quijarro|BO|-20.44|-66.86|1
VAA|Vaasa Airport|Vaasa|FI|63.05|21.76|1
VAR|Varna Airport|Varna|BG|43.23|27.83|1
VAV|Vava'u International Airport|Vava'u Island|TO|-18.59|-173.96|1
VBY|Visby Airport|Visby|SE|57.66|18.35|1
VCA|Can Tho International Airport|Can Tho|VN|10.08|105.71|1
VCE|Venice Marco Polo Airport|Venezia (VE)|IT|45.51|12.35|1
VCP|Viracopos International Airport|Campinas|BR|-23.01|-47.13|1
VER|General Heriberto Jara International Airport|Veracruz|MX|19.14|-96.19|1
VFA|Victoria Falls International Airport|Victoria Falls|ZW|-18.1|25.84|1
VGA|Vijayawada International Airport|Vijayawada|IN|16.53|80.8|1
VIE|Vienna International Airport|Vienna|AT|48.11|16.57|1
VIL|Dakhla Airport|Dakhla|EH|23.72|-15.93|1
VIX|Eurico de Aguiar Salles International Airport|Vitória|BR|-20.26|-40.28|1
VKO|Vnukovo International Airport|Moscow|RU|55.59|37.26|1
VLC|Valencia Airport|Valencia|ES|39.49|-0.48|1
VLI|Bauerfield International Airport|Port Vila|VU|-17.7|168.32|1
VLN|Arturo Michelena International Airport|Valencia|VE|10.15|-67.93|1
VNO|Vilnius International Airport|Vilnius|LT|54.63|25.29|1
VNS|Lal Bahadur Shastri International Airport|Varanasi|IN|25.45|82.86|1
VOG|Volgograd International Airport|Volgograd|RU|48.78|44.34|1
VRA|Juan Gualberto Gomez International Airport|Matanzas|CU|23.03|-81.44|1
VRN|Verona Villafranca Valerio Catullo Airport|Caselle (VR)|IT|45.39|10.89|1
VSA|Carlos Rovirosa Pérez International Airport|Villahermosa|MX|17.99|-92.82|1
VST|Stockholm Västerås Airport|Stockholm / Västerås|SE|59.59|16.63|1
VTE|Wattay International Airport|Vientiane|LA|17.99|102.57|1
VTZ|Alluri Sitarama Raju International Airport (Vizag)|Visakhapatnam|IN|17.97|83.5|1
VVI|Viru Viru International Airport|Santa Cruz|BO|-17.64|-63.14|1
VVO|Vladivostok International Airport|Artyom|RU|43.4|132.15|1
VXE|Cesaria Evora International Airport|São Pedro|CV|16.83|-25.06|1
WAW|Warsaw Chopin Airport|Warsaw|PL|52.17|20.97|1
WDH|Hosea Kutako International Airport|Windhoek|NA|-22.48|17.47|1
WLG|Wellington International Airport|Wellington|NZ|-41.33|174.81|1
WLS|Hihifo Airport|Wallis Island|WF|-13.24|-176.2|1
WMI|Warsaw Modlin Airport|Nowy Dwór Mazowiecki|PL|52.45|20.65|1
WNZ|Wenzhou Longwan International Airport|Wenzhou (Longwan)|CN|27.91|120.85|1
WRO|Copernicus Wrocław Airport|Wrocław|PL|51.1|16.88|1
WTB|Toowoomba Wellcamp Airport|Toowoomba|AU|-27.56|151.79|1
WUH|Wuhan Tianhe International Airport|Wuhan (Huangpi)|CN|30.77|114.21|1
WUX|Sunan Shuofang International Airport|Wuxi|CN|31.5|120.43|1
WVB|Walvis Bay International Airport|Walvis Bay(Rooikop)|NA|-22.98|14.65|1
XBJ|Birjand International Airport|Birjand|IR|32.9|59.28|1
XIY|Xi'an Xianyang International Airport|Xi'an|CN|34.44|108.76|1
XMN|Xiamen Gaoqi International Airport|Xiamen|CN|24.54|118.13|1
XNN|Xining Caojiabao International Airport|Haidong (Huzhu Tu Autonomous County)|CN|36.53|102.04|1
XPL|Palmerola International Airport|Palmerola|HN|14.38|-87.62|1
YAP|Yap International Airport|Yap Island|FM|9.5|138.08|1
YCU|Yuncheng Yanhu International Airport|Yuncheng (Yanhu)|CN|35.12|111.03|1
YEG|Edmonton International Airport|Edmonton|CA|53.31|-113.58|1
YHZ|Halifax / Stanfield International Airport|Halifax|CA|44.88|-63.51|1
YIA|Yogyakarta International Airport|Yogyakarta|ID|-7.91|110.06|1
YIW|Yiwu Airport|Yiwu/Jinhua|CN|29.34|120.03|1
YKS|Platon Oyunsky Yakutsk International Airport|Yakutsk|RU|62.09|129.77|1
YLW|Kelowna International Airport|Kelowna|CA|49.96|-119.38|1
YNB|Prince Abdulmohsen Bin Abdulaziz International Airport|Yanbu|SA|24.14|38.06|1
YNT|Yantai Penglai International Airport|Yantai|CN|37.66|120.98|1
YNY|Yangyang International Airport|Gonghang-ro|KR|38.06|128.67|1
YNZ|Yancheng Nanyang International Airport|Yancheng (Tinghu)|CN|33.43|120.21|1
YOW|Ottawa Macdonald-Cartier International Airport|Ottawa|CA|45.32|-75.67|1
YQB|Quebec Jean Lesage International Airport|Quebec|CA|46.79|-71.39|1
YUL|Montreal / Pierre Elliott Trudeau International Airport|Montréal|CA|45.47|-73.74|1
YVR|Vancouver International Airport|Vancouver|CA|49.19|-123.18|1
YWG|Winnipeg / James Armstrong Richardson International Airport|Winnipeg|CA|49.91|-97.24|1
YXE|Saskatoon John G. Diefenbaker International Airport|Saskatoon|CA|52.17|-106.7|1
YYC|Calgary International Airport|Calgary|CA|51.12|-114.01|1
YYJ|Victoria International Airport|Victoria|CA|48.65|-123.43|1
YYT|St. John's International Airport|St. John's|CA|47.62|-52.75|1
YYZ|Toronto Pearson International Airport|Toronto|CA|43.68|-79.63|1
ZAD|Zadar Airport|Zadar|HR|44.1|15.35|1
ZAG|Zagreb Franjo Tuđman International Airport|Velika Gorica|HR|45.74|16.07|1
ZAH|Zahedan International Airport|Zahedan|IR|29.48|60.91|1
ZAM|Zamboanga International Airport|Zamboanga|PH|6.92|122.06|1
ZAZ|Zaragoza Airport|Zaragoza|ES|41.67|-1.04|1
ZCO|La Araucanía International Airport|Temuco|CL|-38.93|-72.65|1
ZHA|Zhanjiang Wuchuan International Airport|Zhanjiang|CN|21.48|110.59|1
ZIA|Zhukovsky International Airport|Moscow|RU|55.55|38.15|1
ZIH|Ixtapa-Zihuatanejo International Airport|Ixtapa|MX|17.6|-101.46|1
ZNZ|Abeid Amani Karume International Airport|Zanzibar|TZ|-6.22|39.22|1
ZQN|Queenstown Airport|Queenstown|NZ|-45.02|168.75|1
ZRH|Zürich Airport|Zurich|CH|47.46|8.55|1
ZSA|San Salvador International Airport|San Salvador|BS|24.06|-74.52|1
ZSE|Saint-Pierre Pierrefonds Airport|Saint-Pierre|RE|-21.32|55.42|1
ZUH|Zhuhai Jinwan Airport|Zhuhai (Jinwan)|CN|22.01|113.38|1
ZYL|Osmany International Airport|Sylhet|BD|24.96|91.86|1
AAA|Anaa Airport|Anaa|PF|-17.35|-145.51|0
AAP|Aji Pangeran Tumenggung Pranoto International Airport|Samarinda|ID|-0.37|117.25|0
AAQ|Anapa Vityazevo Airport|Krasnyi Kurgan|RU|45.0|37.35|0
AAT|Altay Xuedu Airport|Altay|CN|47.75|88.09|0
AAX|Romeu Zema Airport|Araxá|BR|-19.56|-46.96|0
AAY|Al Ghaydah International Airport|Al Ghaydah|YE|16.19|52.17|0
ABE|Lehigh Valley International Airport|Allentown/Bethlehem|US|40.65|-75.44|0
ABI|Abilene Regional Airport|Abilene|US|32.41|-99.68|0
ABK|Kebri Dahar Airport|Kebri Dahar|ET|6.73|44.24|0
ABL|Ambler Airport|Ambler|US|67.11|-157.86|0
ABR|Aberdeen Regional Airport|Aberdeen|US|45.45|-98.42|0
ABS|Abu Simbel Airport|Abu Simbel|EG|22.38|31.61|0
ABT|King Saud Bin Abdulaziz (Al Baha) Airport|Al-Baha|SA|20.3|41.64|0
ABX|Albury Airport|East Albury|AU|-36.07|146.96|0
ABY|Southwest Georgia Regional Airport|Albany|US|31.53|-84.2|0
ACH|Sankt Gallen Altenrhein Airport|St. Gallen|CH|47.49|9.56|0
ACI|Alderney Airport|Saint Anne|GG|49.71|-2.21|0
ACK|Nantucket Memorial Airport|Nantucket|US|41.25|-70.06|0
ACT|Waco Regional Airport|Waco|US|31.61|-97.23|0
ACV|California Redwood Coast-Humboldt County Airport|Arcata/Eureka|US|40.98|-124.11|0
ACX|Xingyi Wanfenglin Airport|Xingyi|CN|25.08|104.96|0
ACY|Atlantic City International Airport|Atlantic City|US|39.46|-74.58|0
ADF|Adıyaman Airport|Adıyaman|TR|37.73|38.47|0
ADK|Adak Airport|Adak|US|51.88|-176.64|0
ADQ|Kodiak Airport|Kodiak|US|57.75|-152.49|0
ADU|Ardabil Airport|Ardabil|IR|38.33|48.42|0
AEB|Baise (Bose) Bama Airport|Baise (Tianyang)|CN|23.72|106.96|0
AEU|Abu Musa Island Airport|Abu Musa|IR|25.88|55.03|0
AEX|Alexandria International Airport|Alexandria|US|31.33|-92.55|0
AFA|Suboficial Ay Santiago Germano Airport|San Rafael|AR|-34.59|-68.4|0
AFL|Piloto Osvaldo Marques Dias Airport|Alta Floresta|BR|-9.87|-56.11|0
AFZ|Sabzevar National Airport|Sabzevar|IR|36.17|57.6|0
AGH|Ängelholm-Helsingborg Airport|Ängelholm|SE|56.3|12.85|0
AGR|Agra Airport / Agra Air Force Station|Agra|IN|27.16|77.96|0
AGS|Augusta Regional At Bush Field|Augusta|US|33.37|-81.96|0
AGX|Agatti Airport|Agatti|IN|10.82|72.18|0
AHA|Maa Mahamaya Airport|Ambikapur|IN|22.99|83.2|0
AHE|Ahe Airport|Ahe Atoll|PF|-14.43|-146.26|0
AHO|Alghero-Fertilia Airport|Alghero|IT|40.63|8.29|0
AHU|Cherif Al Idrissi Airport|Al Hoceima|MA|35.18|-3.84|0
AIA|Alliance Municipal Airport|Alliance|US|42.05|-102.8|0
AIN|Wainwright Airport|Wainwright|US|70.64|-159.99|0
AJA|Ajaccio Napoléon Bonaparte airport|Ajaccio|FR|41.92|8.8|0
AJI|Ağrı Airport|Ağrı|TR|39.66|43.03|0
AJL|Lengpui Airport|Aizawl (Lengpui)|IN|23.84|92.62|0
AJN|Ouani Airport|Ouani|KM|-12.13|44.43|0
AJR|Arvidsjaur Airport|Arvidsjaur|SE|65.59|19.28|0
AJU|Aracaju - Santa Maria Airport|Aracaju|BR|-10.98|-37.07|0
AKF|Kufra Airport|Kufra|LY|24.18|23.31|0
AKJ|Asahikawa Airport|Higashikagura|JP|43.67|142.45|0
AKN|King Salmon Airport|King Salmon|US|58.68|-156.65|0
AKP|Anaktuvuk Pass Airport|Anaktuvuk Pass|US|68.13|-151.74|0
AKR|Akure Airport|Akure|NG|7.25|5.3|0
AKU|Aksu Hongqipo Airport|Aksu (Onsu)|CN|41.26|80.29|0
AKY|Sittwe Airport|Sittwe|MM|20.13|92.87|0
ALF|Alta Airport|Alta|NO|69.98|23.37|0
ALH|Albany Airport|Albany|AU|-34.94|117.81|0
ALO|Waterloo Regional Airport|Waterloo|US|42.56|-92.4|0
ALS|San Luis Valley Regional Airport/Bergman Field|Alamosa|US|37.43|-105.87|0
ALW|Walla Walla Regional Airport|Walla Walla|US|46.09|-118.29|0
AMA|Rick Husband Amarillo International Airport|Amarillo|US|35.22|-101.71|0
AMH|Arba Minch Airport|Arba Minch|ET|6.04|37.59|0
AMV|Amderma Airport|Amderma|RU|69.76|61.56|0
ANI|Aniak Airport|Aniak|US|61.58|-159.54|0
ANR|Antwerp International Airport (Deurne)|Antwerp|BE|51.19|4.46|0
ANV|Anvik Airport|Anvik|US|62.65|-160.19|0
ANX|Andøya Airport, Andenes|Andenes|NO|69.3|16.14|0
AOG|Anshan Teng'ao Airport / Anshan Air Base|Anshan|CN|41.11|122.85|0
AOI|Marche Airport|Falconara Marittima (AN)|IT|43.62|13.36|0
AOK|Karpathos Airport|Karpathos Island|GR|35.42|27.15|0
AOO|Altoona Blair County Airport|Altoona|US|40.3|-78.32|0
AOR|Sultan Abdul Halim Airport|Alor Satar|MY|6.19|100.4|0
APN|Alpena County Regional Airport|Alpena|US|45.08|-83.56|0
APO|Antonio Roldán Betancur Airport|Carepa|CO|7.81|-76.72|0
AQA|Araraquara Airport|Araraquara|BR|-21.81|-48.13|0
AQG|Anqing Tianzhushan Airport / Anqing North Air Base|Anqing|CN|30.58|117.05|0
ARC|Arctic Village Airport|Arctic Village|US|68.11|-145.58|0
ARH|Talagi Airport|Archangelsk|RU|64.6|40.72|0
ARI|Chacalluta International Airport|Arica|CL|-18.35|-70.34|0
ARK|Arusha Airport|Arusha|TZ|-3.37|36.63|0
ARM|Armidale Airport|Armidale|AU|-30.53|151.62|0
ART|Watertown International Airport|Watertown|US|43.99|-76.02|0
ARU|Araçatuba Airport|Araçatuba|BR|-21.14|-50.42|0
ARW|Arad International Airport|Arad|RO|46.18|21.26|0
ASD|Andros Town Airport|Andros Town|BS|24.7|-77.8|0
ASE|Aspen-Pitkin County Airport (Sardy Field)|Aspen|US|39.22|-106.87|0
ASI|RAF Ascension Island|Cat Hill|SH|-7.97|-14.39|0
ASJ|Amami Airport|Amami|JP|28.43|129.71|0
ASM|Asmara International Airport|Asmara|ER|15.29|38.91|0
ASO|Asosa Airport|Asosa|ET|10.02|34.59|0
ASP|Alice Springs Airport|Alice Springs|AU|-23.81|133.9|0
ASV|Amboseli Airport|Ol Tukai|KE|-2.64|37.25|0
ATC|Arthur's Town Airport|Arthur's Town|BS|24.63|-75.67|0
ATK|Atqasuk Edward Burnell Sr Memorial Airport|Atqasuk|US|70.47|-157.44|0
ATM|Altamira Interstate Airport|Altamira|BR|-3.25|-52.25|0
ATW|Appleton International Airport|Appleton|US|44.26|-88.52|0
ATY|Watertown Regional Airport|Watertown|US|44.91|-97.15|0
AUC|Santiago Perez Airport|Arauca|CO|7.07|-70.74|0
AUG|Augusta State Airport|Augusta|US|44.32|-69.8|0
AUQ|Hiva Oa-Atuona Airport|Hiva Oa Island|PF|-9.77|-139.01|0
AUR|Aurillac airport|Aurillac|FR|44.89|2.42|0
AUX|Araguaína Airport|Araguaína|BR|-7.23|-48.24|0
AVA|Anshun Huangguoshu Airport|Anshun (Xixiu)|CN|26.26|105.87|0
AVK|Arvaikheer Airport|Arvaikheer|MN|46.25|102.8|0
AVL|Asheville Regional Airport|Asheville|US|35.44|-82.54|0
AVN|Avignon Caumont airport|Avignon|FR|43.91|4.9|0
AVP|Wilkes-Barre/Scranton International Airport|Wilkes-Barre/Scranton|US|41.34|-75.72|0
AVR|Amravati  Airport|Amravati|IN|20.81|77.72|0
AWK|Wake Island Airfield|Wake Island|UM|19.28|166.64|0
AXA|Clayton J. Lloyd International Airport|The Valley|AI|18.2|-63.05|0
AXD|Alexandroupoli Democritus Airport|Alexandroupolis|GR|40.86|25.96|0
AXF|Alxa Left Banner Bayanhot Airport|Bayanhot|CN|38.75|105.58|0
AXJ|Amakusa Airport|Amakusa|JP|32.48|130.16|0
AXM|El Eden Airport|Armenia|CO|4.45|-75.77|0
AXP|Spring Point Airport|Spring Point|BS|22.44|-73.97|0
AXR|Arutua Airport|Arutua Airport|PF|-15.25|-146.62|0
AXT|Akita Airport|Akita|JP|39.62|140.22|0
AXU|Axum Airport|Axum|ET|14.15|38.77|0
AYJ|Maharshi Valmiki International Airport|Faizabad|IN|26.75|82.16|0
AYP|Air Force Colonel Alfredo Mendivil Duarte Airport|Ayacucho|PE|-13.15|-74.2|0
AYQ|Ayers Rock Connellan Airport|Yulara|AU|-25.19|130.98|0
AZA|Mesa Gateway Airport|Mesa|US|33.31|-111.65|0
AZD|Shahid Sadooghi Airport|Yazd|IR|31.9|54.28|0
AZN|Andijan International Airport|Andijan|UZ|40.73|72.29|0
AZO|Kalamazoo/Battle Creek International Airport|Kalamazoo|US|42.23|-85.55|0
AZR|Touat-Cheikh Sidi Mohamed Belkebir Airport|Adrar|DZ|27.84|-0.19|0
AZS|Samaná El Catey International Airport|Samana|DO|19.27|-69.74|0
BAL|Batman Airport|Batman|TR|37.93|41.12|0
BAR|Qionghai Bo'ao Airport|Qionghai (Basuo)|CN|19.14|110.45|0
BAY|Maramureș International Airport|Tăuții-Măgherăuș|RO|47.66|23.46|0
BBA|Balmaceda Airport|Balmaceda|CL|-45.92|-71.69|0
BBM|Battambang Airport|Battambang|KH|13.1|103.22|0
BBN|Bario Airport|Bario|MY|3.73|115.48|0
BBO|Berbera Airport|Berbera|SO|10.39|44.94|0
BBQ|Burton-Nibbs International Airport|Codrington|AG|17.62|-61.8|0
BCA|Gustavo Rizo Airport|Baracoa|CU|20.37|-74.51|0
BCH|Baucau Airport|Baucau|TL|-8.49|126.4|0
BCI|Barcaldine Airport|Barcaldine|AU|-23.57|145.3|0
BCO|Jinka Airport|Jinka|ET|5.75|36.56|0
BDB|Bundaberg Airport|Bundaberg|AU|-24.91|152.32|0
BDH|Bandar Lengeh International Airport|Bandar Lengeh|IR|26.53|54.82|0
BDO|Husein Sastranegara International Airport|Bandung|ID|-6.9|107.58|0
BDT|Gbadolite Airport|Gbadolite|CD|4.25|20.98|0
BDU|Bardufoss Airport|Målselv|NO|69.06|18.54|0
BEB|Benbecula Airport|Balivanich|GB|57.48|-7.36|0
BED|Laurence G Hanscom Field|Bedford|US|42.47|-71.29|0
BEF|Bluefields Airport|Bluefields|NI|11.99|-83.77|0
BEJ|Kalimarau Airport|Tanjung Redeb - Borneo Island|ID|2.15|117.43|0
BEK|Bareilly Air Force Station|Bareilly|IN|28.42|79.45|0
BET|Bethel Airport|Bethel|US|60.78|-161.84|0
BEU|Bedourie Airport|Bedourie|AU|-24.35|139.46|0
BFD|Bradford Regional Airport|Bradford|US|41.8|-78.64|0
BFF|Western Neb. Rgnl/William B. Heilig Airport|Scottsbluff|US|41.87|-103.6|0
BFI|King County International Airport - Boeing Field|Seattle|US|47.53|-122.3|0
BFJ|Bijie Feixiong Airport|Bijie|CN|27.27|105.47|0
BFL|Meadows Field|Bakersfield|US|35.43|-119.06|0
BFV|Buri Ram Airport|Buriram|TH|15.23|103.25|0
BFY|Bengbu Tenghu Airport|Bengbu|CN|33.17|117.06|0
BGA|Palonegro Airport|Bucaramanga|CO|7.13|-73.18|0
BGC|Bragança Airport|Bragança|PT|41.86|-6.71|0
BGM|Greater Binghamton/Edwin A Link field|Binghamton|US|42.21|-75.98|0
BGR|Bangor International Airport|Bangor|US|44.81|-68.83|0
BHB|Hancock County-Bar Harbor Airport|Bar Harbor|US|44.45|-68.36|0
BHD|George Best Belfast City Airport|Belfast|GB|54.62|-5.87|0
BHE|Woodbourne Airport|Blenheim|NZ|-41.52|173.87|0
BHH|Bisha Airport|Bisha|SA|19.98|42.62|0
BHI|Comandante Espora Airport|Bahía Blanca|AR|-38.73|-62.17|0
BHJ|Bhuj Airport|Bhuj|IN|23.29|69.67|0
BHQ|Broken Hill Airport|Broken Hill|AU|-32.0|141.47|0
BHS|Bathurst Airport|Bathurst|AU|-33.41|149.65|0
BHU|Bhavnagar Airport|Bhavnagar|IN|21.75|72.19|0
BHV|Bahawalpur Airport|Bahawalpur|PK|29.35|71.72|0
BHY|Beihai Fucheng Airport|Beihai|CN|21.54|109.29|0
BIH|Eastern Sierra Regional Airport|Bishop|US|37.37|-118.36|0
BIK|Frans Kaisiepo Airport|Biak|ID|-1.19|136.11|0
BIL|Billings Logan International Airport|Billings|US|45.81|-108.54|0
BIM|South Bimini Airport|South Bimini|BS|25.7|-79.26|0
BIQ|Biarritz Pays Basque airport|Biarritz|FR|43.47|-1.52|0
BIR|Biratnagar Airport|Biratnagar|NP|26.48|87.26|0
BIS|Bismarck Municipal Airport|Bismarck|US|46.77|-100.75|0
BJB|Bojnord Airport|Bojnord|IR|37.49|57.31|0
BJC|Rocky Mountain Metropolitan Airport|Denver|US|39.91|-105.12|0
BJF|Båtsfjord Airport|Båtsfjord|NO|70.6|29.69|0
BJR|Bahir Dar Airport|Bahir Dar|ET|11.61|37.32|0
BJZ|Badajoz Airport|Badajoz|ES|38.89|-6.82|0
BKG|Branson Airport|Branson|US|36.53|-93.2|0
BKN|Balkanabat International Airport|Balkanabat|TM|39.68|54.21|0
BKQ|Blackall Airport|Blackall|AU|-24.43|145.43|0
BKS|Fatmawati Soekarno Airport|Bengkulu|ID|-3.86|102.34|0
BKW|Raleigh County Memorial Airport|Beaver|US|37.79|-81.12|0
BLD|Boulder City Municipal Airport|Boulder City|US|35.95|-114.86|0
BLE|Dala Airport|Borlange|SE|60.42|15.52|0
BLI|Bellingham International Airport|Bellingham|US|48.79|-122.54|0
BLV|Scott AFB/Midamerica Airport|Belleville|US|38.55|-89.84|0
BMA|Stockholm-Bromma Airport|Stockholm|SE|59.35|17.94|0
BMI|Central Illinois Regional Airport at Bloomington-Normal|Bloomington/Normal|US|40.48|-88.92|0
BMU|Sultan Muhammad Salahuddin Airport|Bima|ID|-8.54|118.69|0
BMV|Buon Ma Thuot Airport|Buon Ma Thuot|VN|12.67|108.12|0
BMW|Bordj Badji Mokhtar Airport|Bordj Badji Mokhtar|DZ|21.38|0.93|0
BNI|Benin Airport|Benin|NG|6.32|5.6|0
BNK|Ballina Byron Gateway Airport|Ballina|AU|-28.83|153.56|0
BNN|Brønnøysund Airport, Brønnøy|Brønnøy|NO|65.46|12.22|0
BNS|Barinas Airport|Barinas|VE|8.62|-70.21|0
BOB|Bora Bora Airport|Motu Mute|PF|-16.44|-151.75|0
BOC|Bocas del Toro "Isla Colón" International Airport|Isla Colón|PA|9.34|-82.25|0
BOH|Bournemouth Airport|Bournemouth|GB|50.78|-1.84|0
BOR|Bokeo International Airport|Ton Phueng|LA|20.32|100.17|0
BPE|Qinhuangdao Beidaihe Airport|Qinhuangdao (Changli)|CN|39.67|119.06|0
BPL|Bole Alashankou Airport|Bole|CN|44.9|82.3|0
BPT|Jack Brooks Regional Airport|Beaumont/Port Arthur|US|29.95|-94.02|0
BPX|Qamdo Bangda Airport|Bangda|CN|30.55|97.11|0
BPY|Besalampy Airport|Besalampy|MG|-16.74|44.48|0
BQK|Brunswick Golden Isles Airport|Brunswick|US|31.26|-81.47|0
BQL|Boulia Airport|Boulia Airport|AU|-22.91|139.9|0
BQN|Rafael Hernández International Airport|Aguadilla|PR|18.49|-67.13|0
BQS|Ignatyevo Airport|Blagoveschensk|RU|50.43|127.42|0
BQU|J F Mitchell Airport|Bequia|VC|12.99|-61.26|0
BRD|Brainerd Lakes Regional Airport|Brainerd|US|46.4|-94.13|0
BRK|Bourke Airport|Bourke Airport|AU|-30.04|145.95|0
BRL|Southeast Iowa Regional Airport|Burlington|US|40.78|-91.13|0
BRN|Bern Airport|Bern|CH|46.91|7.5|0
BRO|Brownsville South Padre Island International Airport|Brownsville|US|25.91|-97.43|0
BRQ|Brno-Tuřany Airport|Brno|CZ|49.15|16.69|0
BRR|Barra Airport|Eoligarry|GB|57.02|-7.44|0
BRW|Wiley Post Will Rogers Memorial Airport|Utqiaġvik|US|71.29|-156.77|0
BRX|Maria Montez International Airport|Barahona|DO|18.25|-71.12|0
BSC|José Celestino Mutis Airport|Bahía Solano|CO|6.2|-77.39|0
BSD|Baoshan Yunrui Airport|Baoshan (Longyang)|CN|25.05|99.17|0
BSO|Basco Airport|Basco|PH|20.45|121.98|0
BTC|Batticaloa International Airport|Batticaloa|LK|7.71|81.68|0
BTI|Barter Island Long Range Radar Station Airport|Barter Island|US|70.13|-143.58|0
BTK|Bratsk Airport|Bratsk|RU|56.37|101.7|0
BTM|Bert Mooney Airport|Butte|US|45.95|-112.5|0
BTR|Baton Rouge Metropolitan Airport|Baton Rouge|US|30.53|-91.15|0
BTU|Bintulu Airport|Bintulu|MY|3.12|113.02|0
BTV|Patrick Leahy Burlington International Airport|Burlington|US|44.47|-73.15|0
BUA|Buka Airport|Buka Island|PG|-5.42|154.67|0
BUN|Gerardo Tobar López Airport|Buenaventura|CO|3.82|-76.99|0
BUX|Bunia Airport|Bunia|CD|1.57|30.22|0
BUZ|Bushehr Airport|Bushehr|IR|28.94|50.83|0
BVE|Brive Souillac airport|Brive|FR|45.04|1.49|0
BVG|Berlevåg Airport|Berlevåg|NO|70.87|29.03|0
BVH|Brigadeiro Camarão Airport|Vilhena|BR|-12.69|-60.1|0
BVI|Birdsville Airport|Birdsville Airport|AU|-25.9|139.35|0
BVJ|Bovanenkovo Airport|Bovanenkovo|RU|70.32|68.33|0
BWK|Brač Airport|Gornji Humac|HR|43.28|16.68|0
BWO|Balakovo Airport|Balakovo|RU|51.86|47.75|0
BWT|Wynyard Airport|Burnie|AU|-41.0|145.73|0
BXH|Balkhash Airport|Balkhash|KZ|46.89|75.0|0
BXR|Bam Airport|Bam|IR|29.08|58.45|0
BXU|Bancasi Airport|Butuan|PH|8.95|125.48|0
BYK|Bouaké Airport|Bouaké|CI|7.74|-5.07|0
BYM|Carlos Manuel de Cespedes Airport|Bayamo|CU|20.4|-76.62|0
BYN|Bayankhongor Airport|Bayankhongor|MN|46.16|100.7|0
BZG|Ignacy Jan Paderewski Bydgoszcz Airport|Bydgoszcz|PL|53.1|17.98|0
BZI|Balıkesir Airport|Balıkesir|TR|39.62|27.93|0
BZK|Bryansk International Airport|Bryansk|RU|53.21|34.18|0
BZL|Barisal Airport|Barisal|BD|22.8|90.3|0
BZN|Bozeman Yellowstone International Airport|Bozeman|US|45.78|-111.15|0
BZO|Bolzano Airport|Bolzano (BZ)|IT|46.46|11.33|0
BZR|Béziers Vias airport|Béziers|FR|43.32|3.35|0
BZX|Bazhong Enyang Airport|Bazhong|CN|31.74|106.64|0
CAB|Cabinda Airport|Cabinda|AO|-5.6|12.19|0
CAC|Coronel Adalberto Mendes da Silva Airport|Cascavel|BR|-25.0|-53.5|0
CAE|Columbia Metropolitan Airport|Columbia|US|33.94|-81.12|0
CAH|Cà Mau Airport|Ca Mau City|VN|9.18|105.18|0
CAJ|Canaima Airport|Canaima|VE|6.23|-62.85|0
CAK|Akron Canton Regional Airport|Akron|US|40.92|-81.44|0
CAL|Campbeltown Airport|Campbeltown|GB|55.44|-5.69|0
CAT|Cascais Airport|Cascais|PT|38.72|-9.36|0
CAW|Bartolomeu Lisandro Airport|Campos dos Goytacazes|BR|-21.7|-41.3|0
CAZ|Cobar Airport|Cobar Airport|AU|-31.54|145.79|0
CBH|Béchar Boudghene Ben Ali Lotfi Airport|Béchar|DZ|31.65|-2.27|0
CBO|Cotabato (Awang) Airport|Datu Odin Sinsuat|PH|7.16|124.21|0
CBQ|Margaret Ekpo International Airport|Calabar|NG|4.98|8.35|0
CBR|Canberra Airport|Canberra|AU|-35.31|149.2|0
CBT|Catumbela Airport|Catumbela|AO|-12.48|13.49|0
CCC|Jardines Del Rey Airport|Cayo Coco|CU|22.46|-78.33|0
CCE|Capital International Airport|New Cairo|EG|30.06|31.84|0
CCF|Carcassonne Salvaza Airport|Carcassonne|FR|43.22|2.31|0
CCR|Buchanan Field|Concord|US|37.99|-122.06|0
CCZ|Chub Cay Airport|Chub Cay|BS|25.42|-77.88|0
CDB|Cold Bay Airport|Cold Bay|US|55.21|-162.73|0
CDC|Cedar City Regional Airport|Cedar City|US|37.7|-113.1|0
CDE|Chengde Puning Airport|Chengde|CN|41.12|118.07|0
CDP|Kadapa Airport|Kadapa|IN|14.51|78.77|0
CDR|Chadron Municipal Airport|Chadron|US|42.84|-103.1|0
CDT|Castellón-Costa Azahar Airport|Castellón de la Plana|ES|40.21|0.07|0
CDV|Merle K (Mudhole) Smith Airport|Cordova|US|60.49|-145.48|0
CEC|Jack Mc Namara Field Airport|Crescent City|US|41.78|-124.24|0
CED|Ceduna Airport|Ceduna Airport|AU|-32.13|133.71|0
CEE|Cherepovets Airport|Cherepovets|RU|59.27|38.02|0
CEN|Ciudad Obregón International Airport|Ciudad Obregón|MX|27.39|-109.83|0
CEZ|Cortez Municipal Airport|Cortez|US|37.3|-108.63|0
CFG|Jaime Gonzalez Airport|Cienfuegos|CU|22.15|-80.41|0
CFN|Donegal Airport|Donegal|IE|55.04|-8.34|0
CFR|Caen Carpiquet airport|Caen|FR|49.18|-0.45|0
CFS|Coffs Harbour Airport|Coffs Harbour|AU|-30.32|153.12|0
CGD|Changde Taohuayuan Airport|Changde (Dingcheng)|CN|28.92|111.64|0
CGI|Cape Girardeau Regional Airport|Cape Girardeau|US|37.23|-89.57|0
CGM|Camiguin Airport|Mambajao|PH|9.25|124.71|0
CGR|Campo Grande Airport|Campo Grande|BR|-20.47|-54.67|0
CHA|Chattanooga Metropolitan Airport (Lovell Field)|Chattanooga|US|35.04|-85.2|0
CHG|Chaoyang Airport|Shuangta, Chaoyang|CN|41.54|120.43|0
CHH|Chachapoyas Airport|Chachapoyas|PE|-6.2|-77.86|0
CHM|FAP Lieutenant Jaime Andres de Montreuil Morales Airport|Chimbote|PE|-9.15|-78.52|0
CHO|Charlottesville Albemarle Airport|Charlottesville|US|38.14|-78.45|0
CHT|Inia William Tuuta Memorial Airport|Te One|NZ|-43.81|-176.47|0
CHX|Changuinola Captain Manuel Niño International Airport|Changuinola|PA|9.46|-82.52|0
CID|The Eastern Iowa Airport|Cedar Rapids|US|41.88|-91.71|0
CIF|Chifeng Yulong Airport|Chifeng|CN|42.16|118.84|0
CIJ|Capitán Aníbal Arab Airport|Cobija|BO|-11.04|-68.78|0
CIU|Chippewa County International Airport|Kincheloe|US|46.24|-84.46|0
CIW|Canouan Airport|Canouan|VC|12.7|-61.34|0
CIY|Comiso Airport|Comiso|IT|37.0|14.61|0
CJA|Mayor General FAP Armando Revoredo Iglesias Airport|Cajamarca|PE|-7.14|-78.49|0
CJC|El Loa Airport|Calama|CL|-22.5|-68.9|0
CJL|Chitral Airport|Chitral|PK|35.89|71.8|0
CJM|Chumphon Airport|Chumphon|TH|10.71|99.36|0
CKB|North Central West Virginia Airport|Bridgeport|US|39.3|-80.23|0
CKH|Chokurdakh Airport|Chokurdah|RU|70.62|147.9|0
CKS|Carajás Airport|Parauapebas|BR|-6.12|-50.0|0
CKZ|Çanakkale Airport|Çanakkale|TR|40.14|26.43|0
CLD|McClellan-Palomar Airport|Carlsbad|US|33.13|-117.28|0
CLL|Easterwood Field|College Station|US|30.59|-96.36|0
CLQ|Licenciado Miguel de la Madrid International Airport|Colima|MX|19.28|-103.58|0
CLY|Calvi Sainte Catherine Airport|Calvi|FR|42.53|8.79|0
CMA|Cunnamulla Airport|Cunnamulla Airport|AU|-28.03|145.62|0
CME|Ciudad del Carmen International Airport|Ciudad del Carmen|MX|18.65|-91.8|0
CMF|Chambéry Aix les Bains airport|Chambéry|FR|45.64|5.88|0
CMG|Corumbá International Airport|Corumbá|BR|-19.01|-57.67|0
CMI|University of Illinois Willard Airport|Savoy|US|40.04|-88.28|0
CMU|Chimbu Airport|Kundiawa|PG|-6.02|144.97|0
CMX|Houghton County Memorial Airport|Hancock|US|47.17|-88.49|0
CNB|Coonamble Airport|Coonamble Airport|AU|-30.98|148.38|0
CNJ|Cloncurry Airport|Cloncurry|AU|-20.67|140.5|0
CNM|Cavern City Air Terminal|Carlsbad|US|32.34|-104.26|0
CNP|Neerlerit Inaat Airport|Neerlerit Inaat|GL|70.74|-22.65|0
CNQ|Corrientes Airport|Corrientes|AR|-27.45|-58.76|0
CNY|Canyonlands Regional Airport|Moab|US|38.76|-109.75|0
COD|Yellowstone Regional Airport|Cody|US|44.52|-109.02|0
COQ|Choibalsan Airport|Choibalsan Airport|MN|48.14|114.65|0
COU|Columbia Regional Airport|Columbia|US|38.82|-92.22|0
CPC|Aviador C. Campos Airport|Chapelco/San Martin de los Andes|AR|-40.08|-71.14|0
CPD|Coober Pedy Airport|Coober Pedy|AU|-29.04|134.72|0
CPE|Ingeniero Alberto Acuña Ongay International Airport|Campeche|MX|19.82|-90.5|0
CPO|Desierto de Atacama Airport|Copiapo|CL|-27.26|-70.78|0
CPR|Casper-Natrona County International Airport|Casper|US|42.91|-106.46|0
CPV|Presidente João Suassuna Airport|Campina Grande|BR|-7.27|-35.9|0
CPX|Benjamin Rivera Noriega Airport|Culebra|PR|18.31|-65.3|0
CQW|Chongqing Xiannüshan Airport|Wulong|CN|29.47|107.69|0
CRI|Colonel Hill Airport|Colonel Hill|BS|22.75|-74.18|0
CRM|Catarman National Airport|Catarman|PH|12.5|124.64|0
CRP|Corpus Christi International Airport|Corpus Christi|US|27.77|-97.5|0
CRV|Crotone Sant'Anna Pythagoras Airport|Isola di Capo Rizzuto (KR)|IT|39.0|17.08|0
CRW|Yeager Airport|Charleston|US|38.37|-81.59|0
CSG|Columbus Airport|Columbus|US|32.52|-84.94|0
CSK|Cap Skirring Airport|Cap Skirring|SN|12.4|-16.75|0
CSW|Cabo San Lucas International Airport|Cabo San Lucas|MX|22.95|-109.94|0
CSY|Cheboksary Airport|Cheboksary|RU|56.09|47.35|0
CTC|Coronel Felipe Varela International Airport|Catamarca|AR|-28.59|-65.75|0
CTD|Alonso Valderrama Airport|Chitré|PA|7.99|-80.41|0
CTL|Charleville Airport|Charleville|AU|-26.41|146.26|0
CTM|Chetumal International Airport|Chetumal|MX|18.5|-88.33|0
CTN|Cooktown Airport|Cooktown Airport|AU|-15.44|145.18|0
CUC|Camilo Daza International Airport|Cúcuta|CO|7.93|-72.51|0
CUE|Mariscal Lamar Airport|Cuenca|EC|-2.89|-78.98|0
CUF|Cuneo International Airport|Levaldigi (CN)|IT|44.55|7.62|0
CUK|Caye Caulker Airport|Caye Caulker|BZ|17.74|-88.03|0
CUM|Antonio José de Sucre Airport|Cumaná|VE|10.45|-64.13|0
CUP|General Francisco Bermúdez Airport|Carúpano|VE|10.66|-63.26|0
CUQ|Coen Airport|Coen|AU|-13.76|143.11|0
CVM|General Pedro Jose Mendez International Airport|Ciudad Victoria|MX|23.7|-98.96|0
CVN|Clovis Municipal Airport|Clovis|US|34.43|-103.08|0
CVQ|Carnarvon Airport|Carnarvon|AU|-24.88|113.67|0
CWA|Central Wisconsin Airport|Mosinee|US|44.78|-89.67|0
CWC|Chernivtsi International Airport|Chernivtsi|UA|48.26|25.98|0
CWJ|Cangyuan Washan Airport|Lincang (Cangyuan)|CN|23.28|99.37|0
CXB|Cox's Bazar Airport|Cox's Bazar|BD|21.46|91.96|0
CXJ|Hugo Cantergiani Regional Airport|Caxias Do Sul|BR|-29.2|-51.19|0
CXP|Tunggul Wulung Airport|Cilacap|ID|-7.65|109.03|0
CYA|Antoine-Simon International Airport|Les Cayes|HT|18.27|-73.79|0
CYB|Charles Kirkconnell International Airport|West End|KY|19.69|-79.88|0
CYC|Caye Chapel Airport|Caye Chapel|BZ|17.68|-88.04|0
CYI|Chiayi Airport|Shuishang|TW|23.46|120.39|0
CYO|Vilo Acuña International Airport|Cayo Largo del Sur|CU|21.62|-81.55|0
CYP|Calbayog Airport|Calbayog City|PH|12.07|124.55|0
CYS|Cheyenne Regional Jerry Olson Field|Cheyenne|US|41.16|-104.81|0
CYX|Cherskiy Airport|Cherskiy|RU|68.74|161.34|0
CYZ|Cauayan Airport|Cauayan City|PH|16.93|121.75|0
CZE|José Leonardo Chirinos Airport|Coro|VE|11.41|-69.68|0
CZH|Corozal Airport|Corozal|BZ|18.38|-88.41|0
CZS|Cruzeiro do Sul Airport|Cruzeiro Do Sul|BR|-7.6|-72.77|0
CZU|Las Brujas Airport|Corozal|CO|9.33|-75.29|0
CZX|Changzhou Benniu International Airport|Changzhou|CN|31.92|119.78|0
DAB|Daytona Beach International Airport|Daytona Beach|US|29.18|-81.06|0
DAU|Daru Airport|Daru|PG|-9.09|143.21|0
DAV|Enrique Malek International Airport|David|PA|8.39|-82.44|0
DAY|James M. Cox Dayton International Airport|Dayton|US|39.9|-84.22|0
DBC|Baicheng Chang'an Airport|Baicheng|CN|45.51|123.02|0
DBO|Dubbo City Regional Airport|Dubbo|AU|-32.22|148.57|0
DBQ|Dubuque Regional Airport|Dubuque|US|42.4|-90.71|0
DBR|Darbhanga Airport|Darbhanga|IN|26.19|85.92|0
DCF|Canefield Airport|Canefield|DM|15.34|-61.39|0
DCM|Castres Mazamet Airport|Castres|FR|43.56|2.29|0
DCY|Daocheng Yading Airport|Garzê (Daocheng)|CN|29.32|100.06|0
DDC|Dodge City Regional Airport|Dodge City|US|37.76|-99.97|0
DDG|Dandong Langtou International Airport|Dandong (Zhenxing)|CN|40.03|124.29|0
DDR|Shigatse Tingri Airport|Xigazê (Dingri)|CN|28.6|86.8|0
DEA|Dera Ghazi Khan Airport|Dera Ghazi Khan|PK|29.96|70.49|0
DEC|Decatur Airport|Decatur|US|39.83|-88.87|0
DED|Dehradun Jolly Grant Airport|Dehradun (Jauligrant)|IN|30.19|78.18|0
DEF|Dezful Airport|Dezful|IR|32.43|48.4|0
DGA|Dangriga Airport|Dangriga|BZ|16.98|-88.23|0
DGO|General Guadalupe Victoria International Airport|Durango|MX|24.13|-104.53|0
DGT|Sibulan Airport|Dumaguete City|PH|9.33|123.3|0
DHM|Kangra Airport|Kangra|IN|32.16|76.26|0
DHN|Dothan Regional Airport|Dothan|US|31.32|-85.45|0
DHX|Dhoho International Airport|Kediri|ID|-7.75|111.95|0
DIB|Dibrugarh Airport|Dibrugarh|IN|27.48|95.02|0
DIE|Arrachart Airport|Antisiranana|MG|-12.35|49.29|0
DIG|Diqing Shangri-La Airport|Diqing (Shangri-La)|CN|27.79|99.68|0
DIJ|Dijon Longvic airport|Dijon|FR|47.27|5.09|0
DIK|Dickinson Theodore Roosevelt Regional Airport|Dickinson|US|46.8|-102.8|0
DIN|Dien Bien Phu Airport|Dien Bien Phu|VN|21.4|103.01|0
DIY|Diyarbakır Airport|Diyarbakır|TR|37.89|40.2|0
DKA|Umaru Musa Yar'adua Airport|Katsina|NG|13.01|7.66|0
DLE|Dole Tavaux Airport|Dole|FR|47.04|5.43|0
DLG|Dillingham Airport|Dillingham|US|59.04|-158.51|0
DLH|Duluth International Airport|Duluth|US|46.84|-92.2|0
DLI|Lien Khuong Airport|Da Lat|VN|11.75|108.37|0
DLU|Dali Fengyi Airport|Dali (Xiaguan)|CN|25.65|100.32|0
DLZ|Dalanzadgad Airport|Dalanzadgad|MN|43.61|104.37|0
DMU|Dimapur Airport|Dimapur|IN|25.88|93.77|0
DND|Dundee Airport|Dundee|GB|56.45|-3.03|0
DNK|Dnipro International Airport|Dnipro|UA|48.36|35.1|0
DNR|Dinard Pleurtuit Saint-Malo airport|Dinard|FR|48.59|-2.08|0
DNZ|Çardak Airport|Denizli|TR|37.79|29.7|0
DOD|Dodoma Airport|Dodoma|TZ|-6.17|35.76|0
DOG|Dongola Airport|Dongola|SD|19.15|30.43|0
DOL|Deauville Normandie airport|Deauville|FR|49.37|0.15|0
DOM|Douglas-Charles Airport|Marigot|DM|15.55|-61.3|0
DOV|Dover Civil Air Terminal/Dover Air Force Base|Dover|US|39.13|-75.47|0
DOY|Dongying Shengli Airport|Dongying (Kenli)|CN|37.5|118.79|0
DPL|Dipolog Airport|Dipolog|PH|8.6|123.34|0
DPO|Devonport Airport|Devonport|AU|-41.17|146.43|0
DRG|Deering Airport|Deering|US|66.07|-162.77|0
DRO|Durango La Plata County Airport|Durango|US|37.15|-107.75|0
DSI|Destin Executive Airport|Destin|US|30.4|-86.47|0
DSO|Sondok Airport|Sŏndŏng-ni|KP|39.75|127.47|0
DTU|Wudalianchi Dedu Airport|Heihe|CN|48.44|126.13|0
DUD|Dunedin International Airport|Dunedin|NZ|-45.93|170.2|0
DUE|Dundo Airport|Chitato|AO|-7.4|20.82|0
DUJ|DuBois Regional Airport|Dubois|US|41.18|-78.9|0
DUM|Pinang Kampai Airport|Dumai|ID|1.61|101.43|0
DUT|Tom Madsen (Dutch Harbor) Airport|Unalaska|US|53.9|-166.54|0
DVL|Devils Lake Regional Airport|Devils Lake|US|48.12|-98.91|0
DWD|Dawadmi Domestic Airport|Dawadmi|SA|24.45|44.12|0
DYR|Ugolny Yuri Ryktheu Airport|Anadyr|RU|64.73|177.74|0
DZH|Dazhou Jinya Airport|Dazhou (Dachuan)|CN|31.05|107.44|0
EAM|Najran Domestic Airport|Najran|SA|17.61|44.42|0
EAR|Kearney Regional Airport|Kearney|US|40.73|-99.01|0
EAS|San Sebastián Airport|Hondarribia|ES|43.36|-1.79|0
EAT|Pangborn Memorial Airport|Wenatchee|US|47.4|-120.21|0
EAU|Chippewa Valley Regional Airport|Eau Claire|US|44.87|-91.48|0
EBA|Marina di Campo Airport|Campo nell'Elba (LI)|IT|42.76|10.24|0
EBD|El-Obeid Airport|El-Obeid|SD|13.15|30.23|0
EBJ|Esbjerg Airport|Esbjerg|DK|55.53|8.55|0
ECP|Northwest Florida Beaches International Airport|Panama City Beach|US|30.36|-85.8|0
EFL|Kefallinia Airport|Kefallinia Island|GR|38.12|20.5|0
EGC|Bergerac Dordogne-Périgord airport|Bergerac|FR|44.83|0.52|0
EGE|Eagle County Regional Airport|Eagle|US|39.64|-106.92|0
EGO|Belgorod International Airport|Belgorod|RU|50.64|36.59|0
EGS|Egilsstaðir Airport|Egilsstaðir|IS|65.28|-14.4|0
EGX|Egegik Airport|Egegik|US|58.18|-157.37|0
EIE|Yeniseysk Airport|Yeniseysk|RU|58.47|92.11|0
EJA|Yariguíes Airport|Barrancabermeja|CO|7.02|-73.81|0
EJH|Al Wajh Domestic Airport|Al Wajh|SA|26.2|36.48|0
EKO|Elko Regional Airport|Elko|US|40.82|-115.79|0
ELC|Elcho Island Airport|Elcho Island|AU|-12.02|135.57|0
ELD|South Arkansas Regional Airport at Goodwin Field|El Dorado|US|33.22|-92.81|0
ELF|El Fasher Airport|El Fasher|SD|13.61|25.32|0
ELG|El Golea Airport|El Menia|DZ|30.58|2.86|0
ELH|North Eleuthera Airport|North Eleuthera|BS|25.48|-76.68|0
ELM|Elmira Corning Regional Airport|Elmira/Corning|US|42.16|-76.89|0
ELU|Guemar Airport - مطار قمار بالوادي|Guemar|DZ|33.51|6.78|0
EMD|Emerald Airport|Emerald|AU|-23.57|148.18|0
EMK|Emmonak Airport|Emmonak|US|62.79|-164.49|0
ENA|Kenai Municipal Airport|Kenai|US|60.57|-151.25|0
ENF|Enontekio Airport|Enontekio|FI|68.36|23.42|0
ENH|Enshi Xujiaping Airport|Enshi (Enshi)|CN|30.32|109.49|0
ENY|Yan'an Nanniwan Airport|Yan'an (Baota)|CN|36.48|109.46|0
EOH|Enrique Olaya Herrera Airport|Medellín|CO|6.22|-75.59|0
EOI|Eday Airport|Eday|GB|59.19|-2.77|0
EPR|Esperance Airport|Esperance|AU|-33.68|121.82|0
EPU|Pärnu Airport|Pärnu|EE|58.42|24.47|0
EQS|Esquel Brigadier Antonio Parodi International Airport|Esquel|AR|-42.91|-71.14|0
ERC|Erzincan Airport|Erzincan|TR|39.71|39.53|0
ERH|Moulay Ali Cherif Airport|Errachidia|MA|31.95|-4.4|0
ERI|Erie International Tom Ridge Field|Erie|US|42.08|-80.17|0
ERL|Erenhot Saiwusu International Airport|Erenhot|CN|43.42|112.09|0
ERS|Eros Airport|Windhoek|NA|-22.6|17.08|0
ERZ|Erzurum International Airport|Erzurum|TR|39.96|41.17|0
ESC|Delta County Airport|Escanaba|US|45.72|-87.09|0
ESD|Orcas Island Airport|Eastsound|US|48.71|-122.91|0
ESL|Elista Airport|Elista|RU|46.37|44.33|0
ESR|Ricardo García Posada Airport|El Salvador|CL|-26.31|-69.77|0
ESU|Essaouira-Mogador Airport|Essaouira|MA|31.4|-9.68|0
ETR|Santa Rosa - Artillery Colonel Victor Larrea International Airport|Santa Rosa|EC|-3.44|-80.0|0
ETZ|Metz-Nancy-Lorraine Airport|Goin|FR|48.98|6.25|0
EUG|Eugene Airport|Eugene|US|44.12|-123.21|0
EUX|F. D. Roosevelt Airport|Oranjestad|BQ|17.5|-62.98|0
EVV|Evansville Regional Airport|Evansville|US|38.04|-87.53|0
EWB|New Bedford Regional Airport|New Bedford|US|41.68|-70.96|0
EWN|Coastal Carolina Regional Airport|New Bern|US|35.07|-77.04|0
EXT|Exeter International Airport|Exeter, Devon|GB|50.73|-3.41|0
EYK|Beloyarskiy Airport|Beloyarskiy Airport|RU|63.69|66.7|0
EYP|El Alcaravan - Yopal Airport|Yopal|CO|5.32|-72.38|0
EYW|Key West International Airport|Key West|US|24.56|-81.76|0
EZS|Elazığ Airport|Elazığ|TR|38.6|39.28|0
FAI|Fairbanks International Airport|Fairbanks|US|64.82|-147.86|0
FAR|Hector International Airport|Fargo|US|46.92|-96.82|0
FAV|Fakarava Airport|Fakarava Airport|PF|-16.05|-145.66|0
FAY|Fayetteville Regional Airport - Grannis Field|Fayetteville|US|34.99|-78.88|0
FCA|Glacier Park International Airport|Kalispell|US|48.31|-114.26|0
FCN|Sea-Airport Cuxhaven/Nordholz / Nordholz Naval Airbase|Wurster Nordseeküste|DE|53.77|8.66|0
FDU|Bandundu Airport|Bandundu|CD|-3.31|17.38|0
FEG|Fergana International Airport|Fergana|UZ|40.36|71.75|0
FEN|Fernando de Noronha Airport|Fernando de Noronha|BR|-3.85|-32.42|0
FGU|Fangatau Airport|Fangatau|PF|-15.82|-140.89|0
FIZ|Fitzroy Crossing Airport|Fitzroy Crossing Airport|AU|-18.18|125.56|0
FKQ|Fakfak Airport|Fakfak|ID|-2.92|132.27|0
FKS|Fukushima Airport|Sukagawa|JP|37.23|140.43|0
FLA|Gustavo Artunduaga Paredes Airport|Florencia|CO|1.59|-75.56|0
FLG|Flagstaff Pulliam Airport|Flagstaff|US|35.14|-111.67|0
FLO|Florence Regional Airport|Florence|US|34.19|-79.72|0
FLW|Flores Airport|Santa Cruz das Flores|PT|39.46|-31.13|0
FLZ|Dr. Ferdinand Lumban Tobing Airport|Sibolga (Pinangsori)|ID|1.56|98.89|0
FMA|Formosa National Airport|Formosa|AR|-26.21|-58.23|0
FMI|Kalemie Airport|Kalemie|CD|-5.88|29.25|0
FNI|Nîmes-Arles-Camargue Airport|Nîmes/Garons|FR|43.76|4.42|0
FNT|Bishop International Airport|Flint|US|42.97|-83.74|0
FOD|Fort Dodge Regional Airport|Fort Dodge|US|42.55|-94.19|0
FOG|Foggia Gino Lisa Airport|Foggia (FG)|IT|41.43|15.53|0
FON|La Fortuna Arenal Airport|La Fortuna|CR|10.47|-84.58|0
FRD|Friday Harbor Airport|Friday Harbor|US|48.52|-123.02|0
FRL|Forlì-Luigi Ridolfi International Airport|Forlì (FC)|IT|44.19|12.07|0
FRO|Florø Airport|Florø|NO|61.58|5.02|0
FRS|Mundo Maya International Airport|San Benito|GT|16.91|-89.87|0
FSD|Sioux Falls Regional Airport|Sioux Falls|US|43.59|-96.74|0
FSM|Fort Smith Regional Airport|Fort Smith|US|35.34|-94.37|0
FSP|Saint-Pierre Pointe-Blanche Airport|Saint-Pierre|PM|46.76|-56.17|0
FTE|El Calafate - Commander Armando Tola International Airport|El Calafate|AR|-50.28|-72.05|0
FTU|Tôlanaro Airport|Tôlanaro|MG|-25.04|46.96|0
FTW|Fort Worth Meacham International Airport|Fort Worth|US|32.82|-97.36|0
FUG|Fuyang Xiguan Airport|Yingzhou, Fuyang|CN|32.88|115.73|0
FUJ|Fukue Airport|Goto|JP|32.67|128.83|0
FUN|Funafuti International Airport|Funafuti|TV|-8.52|179.2|0
FUO|Foshan Shadi Airport|Foshan (Nanhai)|CN|23.08|113.07|0
FWA|Fort Wayne International Airport|Fort Wayne|US|40.98|-85.19|0
FYJ|Fuyuan Dongji Airport|Fuyuan|CN|48.2|134.36|0
FYN|Fuyun Koktokay Airport|Fuyun|CN|46.8|89.51|0
FYU|Fort Yukon Airport|Fort Yukon|US|66.57|-145.25|0
GAJ|Yamagata Airport|Higashine|JP|38.41|140.37|0
GAL|Edward G. Pitka Sr Airport|Galena|US|64.74|-156.94|0
GAM|Gambell Airport|Gambell|US|63.77|-171.73|0
GAQ|Gao International Airport|Gao|ML|16.25|-0.01|0
GAY|Gaya Airport|Gaya|IN|24.74|84.95|0
GBB|Gabala International Airport|Gabala|AZ|40.81|47.73|0
GBJ|Marie-Galante Airport|Grand-Bourg|GP|15.87|-61.27|0
GCC|Northeast Wyoming Regional Airport|Gillette|US|44.35|-105.54|0
GCH|Gachsaran Airport|Gachsaran|IR|30.33|50.83|0
GCI|Guernsey Airport|Saint Peter Port|GG|49.44|-2.6|0
GCK|Garden City Regional Airport|Garden City|US|37.93|-100.72|0
GCN|Grand Canyon National Park Airport|Grand Canyon - Tusayan|US|35.95|-112.15|0
GDB|Gondia Airport|Gondia|IN|21.53|80.29|0
GDE|Gode Airport|Gode|ET|5.94|43.58|0
GDQ|Gondar Airport|Azezo|ET|12.52|37.43|0
GDT|JAGS McCartney International Airport|Cockburn Town|TC|21.44|-71.14|0
GDV|Dawson Community Airport|Glendive|US|47.14|-104.81|0
GDX|Sokol Airport|Magadan|RU|59.91|150.72|0
GDZ|Gelendzhik Airport|Gelendzhik|RU|44.58|38.01|0
GEA|Nouméa Magenta Airport|Nouméa|NC|-22.26|166.47|0
GEL|Santo Ângelo Airport|Santo Ângelo|BR|-28.28|-54.17|0
GEM|President Obiang Nguema International Airport|Mengomeyén|GQ|1.68|11.02|0
GER|Rafael Cabrera Airport|Nueva Gerona|CU|21.83|-82.78|0
GET|Geraldton Airport|Moonyoonooka|AU|-28.8|114.71|0
GEV|Gällivare Airport|Gällivare|SE|67.13|20.81|0
GFF|Griffith Airport|Griffith|AU|-34.25|146.07|0
GFK|Grand Forks International Airport|Grand Forks|US|47.95|-97.18|0
GGG|East Texas Regional Airport|Longview|US|32.38|-94.71|0
GGT|Exuma International Airport|Moss Town|BS|23.56|-75.88|0
GGW|Glasgow Valley County Airport Wokal Field|Glasgow|US|48.21|-106.61|0
GHA|Noumérat - Moufdi Zakaria Airport|El Atteuf|DZ|32.38|3.79|0
GHB|Governor's Harbour Airport|Governor's Harbour|BS|25.28|-76.33|0
GID|Gitega Airport|Gitega|BI|-3.42|29.91|0
GIL|Gilgit Airport|Gilgit|PK|35.92|74.33|0
GIS|Gisborne Airport|Gisborne|NZ|-38.66|177.98|0
GIZ|Jizan Regional Airport / King Abdullah bin Abdulaziz Airport|Jizan|SA|16.9|42.59|0
GJA|La Laguna Airport|Guanaja|HN|16.45|-85.91|0
GJT|Grand Junction Regional Airport|Grand Junction|US|39.13|-108.53|0
GKA|Goroka Airport|Goronka|PG|-6.08|145.39|0
GKN|Gulkana Airport|Gulkana|US|62.16|-145.45|0
GLF|Golfito Airport|Golfito|CR|8.65|-83.18|0
GLH|Mid Delta Regional Airport|Greenville|US|33.48|-90.99|0
GLT|Gladstone Airport|Gladstone|AU|-23.87|151.23|0
GMA|Gemena Airport|Gemena|CD|3.24|19.77|0
GMB|Gambela Airport|Gambela|ET|8.13|34.56|0
GME|Gomel Airport|Gomel|BY|52.53|31.02|0
GMO|Gombe Lawanti International Airport|Gombe|NG|10.3|10.9|0
GMQ|Golog Maqên Airport|Golog (Maqên)|CN|34.42|100.3|0
GMR|Totegegie Airport|Totegegie Airport|PF|-23.08|-134.89|0
GNB|Grenoble Alpes Isère Airport|Grenoble|FR|45.36|5.33|0
GNS|Binaka Airport|Gunungsitoli|ID|1.17|97.71|0
GNV|Gainesville Regional Airport|Gainesville|US|29.69|-82.27|0
GOP|Gorakhpur Airport|Gorakhpur|IN|26.74|83.45|0
GOQ|Golmud Airport|Golmud|CN|36.4|94.79|0
GOV|Gove Airport|Nhulunbuy|AU|-12.27|136.82|0
GPA|Patras Araxos Agamemnon Airport|Patras|GR|38.15|21.43|0
GPI|Guapi Airport|Guapi|CO|2.57|-77.9|0
GPS|Seymour Galapagos Ecological Airport|Isla Baltra|EC|-0.45|-90.27|0
GPT|Gulfport Biloxi International Airport|Gulfport|US|30.41|-89.07|0
GRB|Austin Straubel International Airport|Green Bay|US|44.48|-88.13|0
GRI|Central Nebraska Regional Airport|Grand Island|US|40.97|-98.31|0
GRK|Killeen Regional Airport / Robert Gray Army Airfield|Fort Cavazos|US|31.07|-97.83|0
GRW|Graciosa Airport|Santa Cruz da Graciosa|PT|39.09|-28.03|0
GRX|F.G.L. Airport Granada-Jaén Airport|Granada|ES|37.19|-3.78|0
GRY|Grímsey Airport|Grímsey/Sandvík|IS|66.55|-18.02|0
GSP|Greenville-Spartanburg International Airport|Greenville/Greer/Spartanburg|US|34.9|-82.22|0
GST|Gustavus Airport|Gustavus|US|58.43|-135.71|0
GTE|Groote Eylandt Airport|Groote Eylandt|AU|-13.97|136.46|0
GTF|Great Falls International Airport|Great Falls|US|47.48|-111.37|0
GTR|Golden Triangle Regional Airport|Columbus/W Point/Starkville|US|33.45|-88.59|0
GUC|Gunnison Crested Butte Regional Airport|Gunnison|US|38.53|-106.93|0
GUP|Gallup Municipal Airport|Gallup|US|35.51|-108.79|0
GUR|Gurney Airport|Gurney|PG|-10.31|150.33|0
GVR|Coronel Altino Machado Airport|Governador Valadares|BR|-18.9|-41.98|0
GWL|Gwalior Airport|Gwalior|IN|26.29|78.23|0
GWT|Westerland Sylt Airport|Sylt|DE|54.91|8.34|0
GXG|Negage Airport|Negage|AO|-7.75|15.29|0
GXH|Gannan Xiahe Airport|Gannan (Xiahe)|CN|34.82|102.62|0
GYA|Guayaramerín Airport|Guayaramerín|BO|-10.89|-65.38|0
GYM|General José María Yáñez International Airport|Guaymas|MX|27.97|-110.93|0
GYS|Guangyuan Panlong Airport|Guangyuan (Lizhou)|CN|32.39|105.69|0
GYU|Guyuan Liupanshan Airport|Guyuan (Yuanzhou)|CN|36.08|106.22|0
GYY|Gary/Chicago International Airport|Gary|US|41.62|-87.41|0
GZP|Gazipaşa-Alanya Airport|Gazipaşa|TR|36.3|32.3|0
HAC|Hachijojima Airport|Hachijojima|JP|33.11|139.79|0
HAD|Halmstad Airport|Halmstad|SE|56.69|12.82|0
HAU|Haugesund Airport, Karmøy|Karmøy|NO|59.35|5.21|0
HBX|Hubballi Airport|Hubballi|IN|15.36|75.08|0
HCJ|Hechi Jinchengjiang Airport|Hechi (Jinchengjiang)|CN|24.8|107.71|0
HCR|Holy Cross Airport|Holy Cross|US|62.19|-159.77|0
HCZ|Chenzhou Beihu Airport|Chenzhou|CN|25.75|112.85|0
HDF|Heringsdorf Airport|Zirchow|DE|53.88|14.15|0
HDG|Handan Airport|Handan|CN|36.52|114.42|0
HDM|Hamadan Airport|Hamadan|IR|34.87|48.56|0
HDN|Yampa Valley Airport|Hayden|US|40.48|-107.22|0
HDS|Eastgate Airport / Air Force Base Hoedspruit|Hoedspruit|ZA|-24.36|31.05|0
HEH|Heho Airport|Heho|MM|20.75|96.79|0
HEK|Heihe Aihui Airport|Heihe|CN|50.17|127.31|0
HFA|Uri Michaeli Haifa International Airport|Haifa|IL|32.81|35.04|0
HFN|Hornafjörður Airport|Höfn|IS|64.3|-15.23|0
HFT|Hammerfest Airport|Hammerfest|NO|70.68|23.67|0
HGI|Itanagar Donyi Polo Hollongi Airport|Hollongi|IN|26.97|93.64|0
HGN|Mae Hong Son Airport|Mae Hong Son|TH|19.3|97.98|0
HGO|Korhogo Airport|Korhogo|CI|9.39|-5.56|0
HGR|Hagerstown Regional Richard A Henson Field|Hagerstown|US|39.71|-77.73|0
HGU|Mount Hagen Kagamuga Airport|Mount Hagen|PG|-5.83|144.3|0
HHH|Hilton Head Airport|Hilton Head Island|US|32.22|-80.7|0
HHQ|Hua Hin Airport|Hua Hin|TH|12.64|99.95|0
HHR|Jack Northrop Field Hawthorne Municipal Airport|Hawthorne|US|33.92|-118.33|0
HIB|Range Regional Airport|Hibbing|US|47.38|-92.84|0
HID|Horn Island Airport|Horn|AU|-10.59|142.29|0
HII|Lake Havasu City Airport|Lake Havasu City|US|34.57|-114.36|0
HIN|Sacheon Airport / Sacheon Air Base|Sacheon|KR|35.09|128.07|0
HJJ|Huaihua Zhijiang Airport|Huaihua|CN|27.44|109.7|0
HJR|Khajuraho Airport|Khajuraho|IN|24.82|79.92|0
HKK|Hokitika Airfield|Hokitika Airfield|NZ|-42.71|170.99|0
HKN|Hoskins Airport|Kimbe|PG|-5.46|150.41|0
HLE|Saint Helena International Airport|Jamestown|SH|-15.96|-5.65|0
HLN|Helena Regional Airport|Helena|US|46.61|-111.98|0
HLZ|Hamilton International Airport|Hamilton|NZ|-37.87|175.33|0
HMA|Khanty Mansiysk Airport|Khanty-Mansiysk|RU|61.03|69.09|0
HME|Hassi Messaoud-Oued Irara Krim Belkacem Airport|Hassi Messaoud|DZ|31.67|6.14|0
HMI|Hami Airport|Hami|CN|42.84|93.67|0
HNA|Iwate Hanamaki Airport|Hanamaki|JP|39.43|141.13|0
HNM|Hana Airport|Hana|US|20.8|-156.01|0
HNS|Haines Airport|Haines|US|59.24|-135.52|0
HOB|Lea County Regional Airport|Hobbs|US|32.69|-103.22|0
HOI|Hao Airport|Otepa|PF|-18.07|-140.95|0
HOM|Homer Airport|Homer|US|59.64|-151.48|0
HOR|Horta Airport|Horta|PT|38.52|-28.72|0
HOT|Memorial Field Airport|Hot Springs|US|34.48|-93.1|0
HOV|Ørsta-Volda Airport, Hovden|Ørsta|NO|62.18|6.07|0
HPA|Lifuka Island Airport|Lifuka|TO|-19.78|-174.34|0
HPG|Shennongjia Hongping Airport|Shennongjia (Hongping)|CN|31.63|110.34|0
HPN|Westchester County Airport|White Plains|US|41.07|-73.71|0
HQL|Tashikuergan Hongqilafu Airport|Tashikuergan|CN|37.66|75.29|0
HRI|Mattala Rajapaksa International Airport|Mattala|LK|6.28|81.12|0
HRL|Valley International Airport|Harlingen|US|26.23|-97.65|0
HRO|Boone County Airport|Harrison|US|36.26|-93.15|0
HSC|Shaoguan Danxia Airport|Shaoguan|CN|24.98|113.42|0
HSL|Huslia Airport|Huslia|US|65.7|-156.35|0
HSV|Huntsville International Airport|Huntsville|US|34.64|-86.77|0
HTG|Khatanga Airport|Khatanga|RU|71.98|102.49|0
HTI|Hamilton Island Airport|Hamilton Island|AU|-20.36|148.95|0
HTN|Hotan Airport|Hotan|CN|37.04|79.86|0
HTS|Tri-State Airport / Milton J. Ferguson Field|Huntington|US|38.37|-82.56|0
HTT|Huatugou Airport|Mengnai|CN|38.2|90.84|0
HTY|Hatay Airport|Antakya|TR|36.36|36.29|0
HUH|Huahine-Fare Airport|Fare|PF|-16.69|-151.02|0
HUI|Phu Bai International Airport|Huế|VN|16.4|107.7|0
HUO|Holingol Huolinhe Airport|Holingol|CN|45.49|119.41|0
HUU|Alferez Fap David Figueroa Fernandini Airport|Huánuco|PE|-9.88|-76.2|0
HUY|Humberside Airport|Grimsby, Lincolnshire|GB|53.58|-0.35|0
HUZ|Huizhou Pingtan Airport|Huizhou (Pingtan)|CN|23.05|114.6|0
HVB|Hervey Bay Airport|Hervey Bay|AU|-25.32|152.88|0
HVD|Khovd Airport|Khovd|MN|47.95|91.63|0
HVG|Honningsvåg Airport, Valan|Honningsvåg|NO|71.01|25.98|0
HVN|Tweed New Haven Airport|New Haven|US|41.26|-72.89|0
HVR|Havre City County Airport|Havre|US|48.54|-109.76|0
HXD|Haixi Delingha Airport|Delingha|CN|37.13|97.27|0
HYA|Cape Cod Gateway Airport|Hyannis|US|41.67|-70.28|0
HYN|Taizhou Luqiao Airport|Taizhou (Luqiao)|CN|28.56|121.43|0
HYS|Hays Regional Airport|Hays|US|38.84|-99.27|0
HZA|Heze Mudan Airport|Heze (Dingtao)|CN|35.21|115.74|0
HZG|Hanzhong Chenggu Airport|Hanzhong (Chenggu)|CN|33.13|107.2|0
HZH|Liping Airport|Liping|CN|26.32|109.15|0
IAA|Igarka Airport|Igarka|RU|67.44|86.62|0
IAG|Niagara Falls International Airport|Niagara Falls|US|43.11|-78.95|0
IAM|Zarzaitine - In Aménas Airport|In Aménas|DZ|28.05|9.64|0
IAN|Bob Baker Memorial Airport|Kiana|US|66.98|-160.44|0
IBA|Ibadan Airport|Ibadan|NG|7.36|3.98|0
IBE|Perales Airport|Ibagué|CO|4.42|-75.13|0
ICT|Wichita Dwight D. Eisenhower National Airport|Wichita|US|37.65|-97.43|0
IDA|Idaho Falls Regional Airport|Idaho Falls|US|43.51|-112.07|0
IEG|Zielona Góra-Babimost Airport|Nowe Kramsko|PL|52.14|15.8|0
IFJ|Ísafjörður Airport|Ísafjörður|IS|66.06|-23.14|0
IFO|Ivano-Frankivsk International Airport|Ivano-Frankivsk|UA|48.88|24.69|0
IGA|Inagua Airport|Matthew Town|BS|20.98|-73.67|0
IGD|Iğdır Airport|Iğdır|TR|39.98|43.88|0
IGR|Cataratas Del Iguazú International Airport|Puerto Iguazu|AR|-25.74|-54.47|0
IGT|Magas Airport|Sunzha|RU|43.32|45.01|0
IJK|Izhevsk Airport|Izhevsk|RU|56.83|53.46|0
IKG|Karakol International Airport|Karakol|KG|42.51|78.41|0
IKI|Iki Airport|Iki|JP|33.75|129.79|0
IKS|Tiksi Airport|Tiksi|RU|71.7|128.9|0
ILD|Lleida-Alguaire Airport|Lleida|ES|41.73|0.54|0
ILG|Wilmington Airport|Wilmington|US|39.68|-75.61|0
ILI|Iliamna Airport|Iliamna|US|59.75|-154.91|0
ILM|Wilmington International Airport|Wilmington|US|34.27|-77.91|0
ILP|Île des Pins Airport|Île des Pins|NC|-22.59|167.46|0
ILQ|General Jorge Fernandez Maldon Airport|Ilo|PE|-17.7|-71.34|0
ILS|Ilopango International Airport|San Salvador|SV|13.7|-89.12|0
ILY|Islay Airport|Isle of Islay, Argyll and Bute|GB|55.68|-6.26|0
IMP|Prefeito Renato Moreira Airport|Imperatriz|BR|-5.53|-47.46|0
IMT|Ford Airport|Kingsford|US|45.82|-88.11|0
INH|Inhambane Airport|Inhambane|MZ|-23.88|35.41|0
INL|Falls International Airport|International Falls|US|48.57|-93.4|0
INU|Nauru International Airport|Yaren|NR|-0.55|166.92|0
INV|Inverness Airport|Inverness|GB|57.54|-4.05|0
INZ|In Salah Airport|In Salah|DZ|27.25|2.51|0
IOA|Ioannina King Pyrrhus National Airport|Ioannina|GR|39.7|20.82|0
IOS|Bahia - Jorge Amado Airport|Ilhéus|BR|-14.82|-39.03|0
IPI|San Luis Airport|Ipiales|CO|0.86|-77.67|0
IPL|Imperial County Airport|Imperial|US|32.84|-115.57|0
IPN|Usiminas Airport|Ipatinga|BR|-19.47|-42.49|0
IPT|Williamsport Regional Airport|Williamsport|US|41.24|-76.92|0
IQM|Qiemo Yudu Airport|Qiemo|CN|38.23|85.47|0
IQN|Qingyang Xifeng Airport|Qingyang (Xifeng)|CN|35.8|107.6|0
IRG|Lockhart River Airport|Lockhart River|AU|-12.79|143.3|0
IRJ|Capitan V A Almonacid Airport|La Rioja|AR|-29.38|-66.8|0
IRK|Kirksville Regional Airport|Kirksville|US|40.09|-92.54|0
IRP|Matari Airport|Isiro|CD|2.83|27.59|0
ISA|Mount Isa Airport|Mount Isa|AU|-20.67|139.49|0
ISE|Süleyman Demirel International Airport|Isparta|TR|37.86|30.37|0
ISG|New Ishigaki Airport|Ishigaki|JP|24.4|124.25|0
ISP|Long Island MacArthur Airport|Islip|US|40.8|-73.1|0
ISU|Jalal Talabani International Airport|Sulaymaniyah|IQ|35.56|45.32|0
ITB|Itaituba Airport|Itaituba|BR|-4.24|-56.0|0
ITH|Ithaca Tompkins Regional Airport|Ithaca|US|42.49|-76.46|0
ITO|Hilo International Airport|Hilo|US|19.72|-155.05|0
IUE|Niue International Airport|Alofi|NU|-19.08|-169.92|0
IVC|Invercargill Airport|Invercargill|NZ|-46.41|168.31|0
IWA|Ivanovo South Airport|Ivanovo|RU|56.94|40.94|0
IWJ|Iwami Airport|Masuda|JP|34.68|131.79|0
IWK|Iwakuni Kintaikyo Airport|Iwakuni|JP|34.15|132.25|0
IXA|Agartala - Maharaja Bir Bikram Airport|Agartala|IN|23.89|91.24|0
IXD|Prayagraj Airport|Allahabad|IN|25.44|81.73|0
IXG|Belagavi Airport|Belgaum|IN|15.86|74.62|0
IXI|Lilabari North Lakhimpur Airport|Lilabari|IN|27.3|94.1|0
IXJ|Jammu Airport|Jammu|IN|32.69|74.84|0
IXK|Keshod Airport|Keshod|IN|21.32|70.27|0
IXL|Leh Kushok Bakula Rimpochee Airport|Leh|IN|34.14|77.55|0
IXM|Madurai Airport|Madurai|IN|9.83|78.09|0
IXP|Pathankot Airport|Pathankot|IN|32.23|75.63|0
IXR|Birsa Munda Airport|Ranchi|IN|23.31|85.32|0
IXS|Silchar Airport|Silchar|IN|24.91|92.98|0
IXU|Aurangabad Airport|Aurangabad|IN|19.86|75.4|0
IXY|Kandla Airport|Kandla|IN|23.11|70.1|0
IZA|Presidente Itamar Franco Airport|Juiz de Fora|BR|-21.51|-43.17|0
IZO|Izumo Enmusubi Airport|Izumo|JP|35.41|132.89|0
IZT|General Antonio Cárdenas Rodríguez National Airport / Ixtepec Air Base|Ixtepec|MX|16.45|-95.09|0
JAC|Jackson Hole Airport|Jackson|US|43.61|-110.74|0
JAE|Shumba Airport|Jaén|PE|-5.59|-78.77|0
JAN|Jackson-Medgar Wiley Evers International Airport|Jackson|US|32.31|-90.08|0
JAU|Francisco Carle Airport|Jauja|PE|-11.78|-75.47|0
JAV|Ilulissat Airport|Ilulissat|GL|69.24|-51.06|0
JBQ|La Isabela International Airport|La Isabela|DO|18.57|-69.99|0
JBR|Jonesboro Municipal Airport|Jonesboro|US|35.83|-90.65|0
JDF|Francisco de Assis Airport|Juiz de Fora|BR|-21.79|-43.39|0
JDH|Jodhpur Airport|Jodhpur|IN|26.25|73.05|0
JDZ|Jingdezhen Luojia Airport|Jingdezhen|CN|29.34|117.18|0
JEE|Jérémie Airport|Carrefour Sanon|HT|18.66|-74.17|0
JEG|Aasiaat Airport|Aasiaat|GL|68.72|-52.78|0
JER|Jersey Airport|St. Peter|JE|49.21|-2.2|0
JGA|Jamnagar Airport|Jamnagar|IN|22.47|70.01|0
JGD|Daxing'anling Elunchun Airport|Jiagedaqi|CN|50.37|124.12|0
JGS|Jinggangshan Airport|Ji'an|CN|26.86|114.74|0
JHM|Kapalua Airport|Lahaina|US|20.96|-156.67|0
JHS|Sisimiut Airport|Sisimiut|GL|66.95|-53.73|0
JIC|Jinchang Jinchuan Airport|Jinchang|CN|38.54|102.35|0
JIM|Jimma Airport|Jimma|ET|7.67|36.82|0
JIQ|Qianjiang Wulingshan Airport|Qianjiang|CN|29.51|108.83|0
JJD|Comandante Ariston Pessoa Airport|Cruz|BR|-2.91|-40.36|0
JJU|Qaqortoq Airport|Qaqortoq|GL|60.76|-46.07|0
JKG|Jönköping Airport|Jönköping|SE|57.76|14.07|0
JKH|Chios Island National Airport|Chios Island|GR|38.34|26.14|0
JKR|Janakpur Airport|Janakpur|NP|26.71|85.92|0
JLN|Joplin Regional Airport|Joplin|US|37.15|-94.5|0
JLR|Jabalpur Airport|Jabalpur|IN|23.18|80.05|0
JMJ|Lancang Jingmai Airport|Pu'er (Lancang)|CN|22.42|99.78|0
JMK|Mykonos Island National Airport|Mykonos|GR|37.44|25.35|0
JMS|Jamestown Regional Airport|Jamestown|US|46.93|-98.68|0
JMU|Jiamusi Songjiang International Airport|Jiamusi|CN|46.84|130.46|0
JNG|Jining Da'an Airport|Jining|CN|35.65|116.74|0
JNH|Jiaxing Nanhu Airport|Xiuzhou, Hangzhou|CN|30.7|120.66|0
JNU|Juneau International Airport|Juneau|US|58.35|-134.57|0
JNZ|Jinzhou Bay Airport|Jinzhou (Linghai)|CN|40.94|121.28|0
JOE|Joensuu Airport|Joensuu|FI|62.66|29.62|0
JOG|Adisutjipto International Airport|Yogyakarta|ID|-7.79|110.43|0
JOI|Lauro Carneiro de Loyola Airport|Joinville|BR|-26.22|-48.8|0
JOL|Jolo Airport|Jolo|PH|6.05|121.01|0
JOS|Yakubu Gowon Airport|Jos|NG|9.64|8.87|0
JRH|Jorhat Airport|Jorhat|IN|26.73|94.18|0
JSA|Jaisalmer Airport|Jaisalmer Airport|IN|26.89|70.86|0
JSH|Sitia Airport|Crete Island|GR|35.22|26.1|0
JSI|Skiathos Island National Airport|Skiathos|GR|39.18|23.5|0
JSJ|Jiansanjiang Shidi Airport|Jiansanjiang|CN|47.11|132.66|0
JSR|Jessore Airport|Jashore (Jessore)|BD|23.18|89.16|0
JST|John Murtha Johnstown Cambria County Airport|Johnstown|US|40.32|-78.83|0
JTC|Bauru/Arealva–Moussa Nakhal Tobias State Airport|Bauru|BR|-22.16|-49.07|0
JUZ|Quzhou Airport|Quzhou (Kezheng)|CN|28.97|118.9|0
JXA|Jixi Xingkaihu Airport|Jixi|CN|45.29|131.19|0
JYV|Jyväskylä Airport|Jyväskylän Maalaiskunta|FI|62.4|25.68|0
JZH|Jiuzhai Huanglong Airport|Ngawa (Songpan)|CN|32.85|103.68|0
KAB|Kariba Airport|Kariba|ZW|-16.52|28.89|0
KAC|Qamishli International Airport|Qamishli|SY|37.02|41.19|0
KAI|Kaieteur Airport|Kaieteur Falls|GY|5.18|-59.49|0
KAJ|Kajaani Airport|Kajaani|FI|64.29|27.69|0
KAO|Kuusamo Airport|Kuusamo|FI|65.99|29.24|0
KAT|Kaitaia Airport|Awanui|NZ|-35.07|173.29|0
KAW|Kawthoung Airport|Kawthoung|MM|10.05|98.54|0
KBR|Sultan Ismail Petra Airport|Kota Baharu|MY|6.17|102.29|0
KCM|Kahramanmaraş Airport|Kahramanmaraş|TR|37.54|36.95|0
KCT|Koggala Airport|Galle|LK|5.99|80.32|0
KCY|Krasnoyarsk Cheremshanka Airport|Krasnoyarsk|RU|56.18|92.55|0
KDL|Kärdla Airport|Kärdla|EE|58.99|22.83|0
KDM|Kaadedhdhoo Airport|Huvadhu Atoll|MV|0.49|73.0|0
KDO|Kadhdhoo Airport|Kadhdhoo|MV|1.86|73.52|0
KEM|Kemi-Tornio Airport|Kemi / Tornio|FI|65.78|24.58|0
KEP|Nepalgunj Airport|Nepalgunj|NP|28.1|81.67|0
KET|Kengtung Airport|Kengtung|MM|21.3|99.64|0
KFS|Kastamonu Airport|Kastamonu|TR|41.31|33.8|0
KGA|Kananga Airport|Kananga|CD|-5.9|22.47|0
KGC|Kingscote Airport|Kingscote Airport|AU|-35.71|137.52|0
KGI|Kalgoorlie Boulder Airport|Broadwood|AU|-30.79|121.46|0
KGP|Kogalym International Airport|Kogalym|RU|62.19|74.53|0
KGT|Kangding Airport|Garzê (Kangding)|CN|30.14|101.74|0
KHD|Khoram Abad Airport|Khoram Abad Airport|IR|33.44|48.28|0
KHE|Kherson International Airport|Kherson|UA|46.68|32.51|0
KHK|Khark Airport|Khark|IR|29.26|50.32|0
KHS|Khasab Airport|Khasab|OM|26.17|56.24|0
KHT|Khost International Airport|Khost|AF|33.28|69.81|0
KHV|Khabarovsk Novy Airport|Khabarovsk|RU|48.53|135.19|0
KHX|Savannah Airstrip|Kihihi|UG|-0.72|29.7|0
KIR|Kerry Airport|Farranfore|IE|52.18|-9.52|0
KJB|Kurnool Airport|Orvakal|IN|15.72|78.17|0
KJH|Kaili Huangping Airport|Kaili  (Huangping)|CN|26.97|107.99|0
KJI|Burqin Kanas Airport|Burqin|CN|48.22|87.0|0
KJT|Kertajati International Airport|Kertajati|ID|-6.65|108.17|0
KKC|Khon Kaen Airport|Khon Kaen|TH|16.47|102.78|0
KKE|Kerikeri Airport|Kerikeri|NZ|-35.26|173.91|0
KKN|Kirkenes Airport, Høybuktmoen|Kirkenes|NO|69.73|29.89|0
KKR|Kaukura Airport|Raitahiti|PF|-15.66|-146.88|0
KKS|Kashan Airport|Kashan|IR|33.9|51.58|0
KKW|Kikwit Airport|Kikwit|CD|-5.04|18.79|0
KKX|Kikai Airport|Kikai|JP|28.32|129.93|0
KLH|Kolhapur Airport|Kolhapur|IN|16.66|74.29|0
KLR|Kalmar Airport|Kalmar|SE|56.69|16.29|0
KLW|Klawock Airport|Klawock|US|55.58|-133.08|0
KLX|Kalamata Airport|Kalamata|GR|37.07|22.03|0
KMA|Kerema Airport|Kerema|PG|-7.96|145.77|0
KMC|King Khaled Military City Airport|King Khaled Military City|SA|27.9|45.53|0
KME|Kamembe Airport|Kamembe|RW|-2.46|28.91|0
KMW|Kostroma Sokerkino Airport|Kostroma|RU|57.8|41.02|0
KND|Kindu Airport|Kindu|CD|-2.92|25.92|0
KNG|Utarom Airport|Kaimana|ID|-3.64|133.7|0
KNH|Kinmen Airport|Shang-I|TW|24.43|118.36|0
KNQ|Koné Airport|Koné|NC|-21.05|164.84|0
KNS|King Island Airport|King Island Airport|AU|-39.88|143.88|0
KNU|Kanpur Airport|Kanpur|IN|26.4|80.41|0
KNX|East Kimberley Regional (Kununurra) Airport|Kununurra|AU|-15.78|128.71|0
KOE|El Tari Airport|Kupang|ID|-10.17|123.67|0
KOI|Kirkwall Airport|Kirkwall, Orkney Islands|GB|58.96|-2.91|0
KOK|Kokkola-Pietarsaari Airport|Kokkola / Kruunupyy|FI|63.72|23.14|0
KOP|Nakhon Phanom Airport|Nakhon Phanom|TH|17.38|104.64|0
KPO|Pohang Airport (G-815/K-3)|Pohang|KR|35.99|129.42|0
KPW|Keperveem Airport|Keperveem|RU|67.85|166.14|0
KQH|Kishangarh Airport Ajmer|Ajmer (Kishangarh)|IN|26.59|74.81|0
KRF|Kramfors-Sollefteå Höga Kusten Airport|Nyland|SE|63.05|17.77|0
KRL|Korla Licheng Airport|Korla|CN|41.61|86.14|0
KRO|Kurgan Airport|Kurgan|RU|55.48|65.42|0
KRP|Midtjyllands Airport / Air Base Karup|Karup|DK|56.3|9.1|0
KRW|Turkmenbaşy International Airport|Turkmenbaşy|TM|40.06|53.01|0
KSC|Košice International Airport|Košice|SK|48.66|21.24|0
KSD|Karlstad Airport|Karlstad|SE|59.44|13.34|0
KSH|Shahid Ashrafi Esfahani Airport|Kermanshah|IR|34.35|47.16|0
KSL|Kassala Airport|Kassala|SD|15.39|36.33|0
KSU|Kristiansund Airport, Kvernberget|Kvernberget|NO|63.11|7.82|0
KSY|Kars Airport|Kars|TR|40.56|43.12|0
KSZ|Kotlas Airport|Kotlas|RU|61.24|46.7|0
KTA|Karratha Airport|Karratha|AU|-20.71|116.77|0
KTD|Kitadaito Airport|Kitadaitōjima|JP|25.94|131.33|0
KTG|Rahadi Osman Airport|Ketapang|ID|-1.82|109.96|0
KTN|Ketchikan International Airport|Ketchikan|US|55.36|-131.71|0
KTP|Tinson Pen Airport|Tinson Pen|JM|17.99|-76.82|0
KUA|Kuantan Airport|Kuantan|MY|3.78|103.21|0
KUH|Kushiro Airport|Kushiro|JP|43.04|144.19|0
KUM|Yakushima Airport|Yakushima|JP|30.39|130.66|0
KUS|Kulusuk Airport|Kulusuk|GL|65.57|-37.12|0
KUU|Kullu Manali Airport|Bhuntar|IN|31.88|77.15|0
KUV|Gunsan Airport / Gunsan Air Base|Gunsan|KR|35.9|126.62|0
KVG|Kavieng Airport|Kavieng|PG|-2.58|150.81|0
KVO|Morava Airport|Kraljevo|RS|43.82|20.59|0
KVX|Pobedilovo Airport|Kirov|RU|58.5|49.35|0
KWA|Bucholz Army Air Field|Kwajalein|MH|8.72|167.73|0
KWG|Kryvyi Rih International Airport|Kryvyi Rih|UA|48.04|33.21|0
KWJ|Gwangju Airport|Gwangju|KR|35.12|126.81|0
KWM|Kowanyama Airport|Kowanyama|AU|-15.49|141.75|0
KWZ|Kolwezi Airport|Kolwezi|CD|-10.77|25.51|0
KXB|Sangia Nibandera Airport|Kolaka|ID|-4.34|121.52|0
KXK|Komsomolsk-on-Amur Airport|Komsomolsk-on-Amur|RU|50.41|136.93|0
KYD|Lanyu Airport|Orchid Island|TW|22.03|121.54|0
KYP|Kyaukpyu Airport|Kyaukpyu|MM|19.43|93.53|0
KYS|Kayes Dag Dag Airport|Kayes|ML|14.48|-11.4|0
KYZ|Kyzyl Airport|Kyzyl|RU|51.67|94.4|0
KZI|Kozani National Airport Filippos|Kozani|GR|40.29|21.84|0
LAF|Purdue University Airport|West Lafayette|US|40.41|-86.94|0
LAJ|Lages Airport|Lages|BR|-27.78|-50.28|0
LAL|Lakeland Linder International Airport|Lakeland|US|27.99|-82.02|0
LAN|Capital Region International Airport|Lansing|US|42.78|-84.59|0
LAP|Manuel Márquez de León International Airport|La Paz|MX|24.07|-110.36|0
LAR|Laramie Regional Airport|Laramie|US|41.31|-105.68|0
LAU|Manda Airport|Lamu|KE|-2.25|40.91|0
LAW|Lawton Fort Sill Regional Airport|Lawton|US|34.57|-98.42|0
LBB|Lubbock Preston Smith International Airport|Lubbock|US|33.66|-101.82|0
LBC|Lübeck Blankensee Airport|Lübeck|DE|53.81|10.72|0
LBE|Arnold Palmer Regional Airport|Latrobe|US|40.28|-79.4|0
LBF|North Platte Regional Airport Lee Bird Field|North Platte|US|41.13|-100.68|0
LBL|Liberal Mid-America Regional Airport|Liberal|US|37.04|-100.96|0
LBS|Labasa Airport|Labasa|FJ|-16.47|179.34|0
LBU|Labuan Airport|Labuan|MY|5.3|115.25|0
LCE|Golosón International Airport|La Ceiba|HN|15.74|-86.85|0
LCG|A Coruña Airport|Culleredo|ES|43.3|-8.38|0
LCH|Lake Charles Regional Airport|Lake Charles|US|30.13|-93.22|0
LCK|Rickenbacker International Airport|Columbus|US|39.81|-82.93|0
LCX|Liancheng Guanzhishan Airport|Longyan (Liancheng)|CN|25.68|116.75|0
LCY|London City Airport|London|GB|51.51|0.06|0
LDB|Governor José Richa Airport|Londrina|BR|-23.33|-51.13|0
LDE|Tarbes-Lourdes-Pyrénées Airport|Tarbes/Lourdes/Pyrénées|FR|43.18|-0.01|0
LDS|Yichun Lindu Airport|Yichun|CN|47.75|129.02|0
LDU|Lahad Datu Airport|Lahad Datu|MY|5.03|118.32|0
LDX|Saint-Laurent-du-Maroni Airport|Saint-Laurent-du-Maroni|GF|5.48|-54.03|0
LDY|City of Derry Airport|Derry, Derry and Strabane|GB|55.04|-7.16|0
LEA|Learmonth Airport|Exmouth|AU|-22.24|114.09|0
LEB|Lebanon Municipal Airport|Lebanon|US|43.63|-72.3|0
LEI|Almería Airport|Almería|ES|36.84|-2.37|0
LEN|León Airport|La Virgen del Camino|ES|42.59|-5.65|0
LER|Leinster Airport|Leinster Airport|AU|-27.84|120.7|0
LET|Alfredo Vásquez Cobo International Airport|Leticia|CO|-4.19|-69.94|0
LEU|Pirineus - la Seu d'Urgel Airport|La Seu d'Urgell Pyrenees and Andorra|ES|42.34|1.41|0
LEX|Blue Grass Airport|Lexington|US|38.04|-84.61|0
LFM|Lamerd Airport|Lamerd|IR|27.37|53.19|0
LFQ|Linfen Yaodu Airport|Linfen (Yaodu)|CN|36.13|111.64|0
LFT|Lafayette Regional Airport|Lafayette|US|30.21|-91.99|0
LGG|Liège Airport|Grâce-Hollogne|BE|50.64|5.44|0
LGI|Deadman's Cay Airport|Deadman's Cay|BS|23.18|-75.09|0
LHG|Lightning Ridge Airport|Lightning Ridge Airport|AU|-29.45|147.98|0
LHL|Lachin International Airport|Lachin|AZ|39.88|46.36|0
LHS|Las Heras Airport|Las Heras|AR|-46.54|-68.97|0
LIF|Lifou Airport|Lifou|NC|-20.77|167.24|0
LIG|Limoges Airport|Limoges/Bellegarde|FR|45.86|1.18|0
LIO|Limón International Airport|Limón|CR|9.96|-83.02|0
LIT|Bill & Hillary Clinton National Airport/Adams Field|Little Rock|US|34.73|-92.22|0
LIW|Loikaw Airport|Loikaw|MM|19.69|97.21|0
LKL|Lakselv Airport, Banak|Lakselv|NO|70.07|24.97|0
LKN|Leknes Airport|Leknes|NO|68.15|13.61|0
LLF|Yongzhou Lingling Airport|Yongzhou|CN|26.34|111.61|0
LLV|Lüliang Dawu Airport|Lüliang|CN|37.68|111.14|0
LME|Le Mans-Arnage Airport|Le Mans, Sarthe|FR|47.95|0.2|0
LMM|Valle del Fuerte International Airport|Los Mochis|MX|25.69|-109.08|0
LMN|Limbang Airport|Limbang|MY|4.81|115.01|0
LMP|Lampedusa Airport|Lampedusa|IT|35.5|12.62|0
LNJ|Lincang Boshang Airport|Lincang|CN|23.74|100.03|0
LNK|Lincoln Airport|Lincoln|US|40.84|-96.76|0
LNL|Longnan Chengzhou Airport|Longnan (Cheng)|CN|33.79|105.79|0
LNO|Leonora Airport|Leonora|AU|-28.88|121.32|0
LNS|Lancaster Airport|Lancaster|US|40.12|-76.3|0
LNY|Lanai Airport|Lanai City|US|20.79|-156.95|0
LOE|Loei Airport|Loei Airport|TH|17.44|101.72|0
LOO|Laghouat - Molay Ahmed Medeghri Airport|Laghouat|DZ|33.76|2.93|0
LPF|Liupanshui Yuezhao Airport|Liupanshui (Zhongshan)|CN|26.61|104.98|0
LPK|Lipetsk Airport|Lipetsk|RU|52.7|39.54|0
LPT|Lampang Airport|Lampang Airport|TH|18.27|99.5|0
LRD|Laredo International Airport|Laredo|US|27.54|-99.46|0
LRE|Longreach Airport|Longreach|AU|-23.43|144.28|0
LRH|La Rochelle Île de Ré Airport|La Rochelle|FR|46.18|-1.2|0
LRR|Lar Airport|Lar|IR|27.67|54.38|0
LRT|Lorient South Brittany (Bretagne Sud) Airport|Lorient/Lann/Bihoué|FR|47.76|-3.44|0
LRU|Las Cruces International Airport|Las Cruces|US|32.29|-106.92|0
LSC|La Florida Airport|La Serena-Coquimbo|CL|-29.92|-71.2|0
LSE|La Crosse Regional Airport|La Crosse|US|43.88|-91.26|0
LSG|Leshan Airport|Leshan (Wutongqiao)|CN|29.44|103.75|0
LSH|Lashio Airport|Lashio|MM|22.98|97.75|0
LSI|Sumburgh Airport|Lerwick, Shetland|GB|59.88|-1.3|0
LSP|Josefa Camejo International Airport|Paraguaná|VE|11.78|-70.15|0
LSR|Alas Leuser Airport|Kutacane|ID|3.39|97.86|0
LST|Launceston Airport|Launceston (Western Junction)|AU|-41.54|147.21|0
LSY|Lismore Airport|Lismore|AU|-28.83|153.26|0
LTD|Ghadames Airport|Ghadames|LY|30.15|9.7|0
LTI|Altai Airport|Altai|MN|46.38|96.22|0
LTK|Latakia International Airport|Latakia|SY|35.4|35.95|0
LTM|Lethem Airport|Lethem|GY|3.37|-59.79|0
LTU|Murod Kond Airport|Latur|IN|18.41|76.46|0
LTX|Cotopaxi International Airport|Latacunga|EC|-0.91|-78.62|0
LUA|Tenzing-Hillary Airport|Lukla|NP|27.69|86.73|0
LUD|Luderitz Airport|Luderitz|NA|-26.69|15.24|0
LUG|Lugano Airport|Agno|CH|46.0|8.91|0
LUK|Cincinnati Municipal Airport Lunken Field|Cincinnati|US|39.1|-84.42|0
LUM|Dehong Mangshi International Airport|Dehong (Mangshi)|CN|24.4|98.53|0
LUQ|Brigadier Mayor D Cesar Raul Ojeda Airport|San Luis|AR|-33.27|-66.36|0
LUR|Cape Lisburne LRRS Airport|Cape Lisburne|US|68.88|-166.11|0
LUV|Karel Sadsuitubun Airport|Langgur|ID|-5.76|132.76|0
LWB|Greenbrier Valley Airport|Lewisburg|US|37.86|-80.4|0
LWS|Lewiston Nez Perce County Airport|Lewiston|US|46.37|-117.01|0
LYC|Lycksele Airport|Lycksele|SE|64.55|18.72|0
LYH|Lynchburg Regional Airport - Preston Glenn Field|Lynchburg|US|37.33|-79.2|0
LYI|Linyi Qiyang Airport|Linyi (Hedong)|CN|35.05|118.41|0
LYR|Svalbard Airport, Longyear|Longyearbyen|NO|78.25|15.47|0
LZG|Langzhong Gucheng Airport|Nanchong (Langzhong)|CN|31.5|106.03|0
LZH|Liuzhou Bailian Airport / Bailian Air Base|Liuzhou (Liujiang)|CN|24.21|109.39|0
LZN|Matsu Nangan Airport|Matsu (Nangan)|TW|26.16|119.96|0
LZO|Luzhou Yunlong Airport|Luzhou (Yunlong)|CN|29.03|105.47|0
LZY|Nyingchi Mainling Airport|Nyingchi (Mainling)|CN|29.3|94.34|0
MAB|João Correa da Rocha Airport|Marabá|BR|-5.37|-49.14|0
MAF|Midland International Air and Space Port|Midland|US|31.94|-102.2|0
MAG|Madang Airport|Madang|PG|-5.21|145.79|0
MAK|Malakal International Airport|Malakal|SS|9.56|31.65|0
MAM|General Servando Canales International Airport|Matamoros|MX|25.77|-97.53|0
MAQ|Mae Sot Airport|Mae Sot Airport|TH|16.7|98.55|0
MAS|Momote Airport|Manus Island|PG|-2.06|147.42|0
MAU|Maupiti Airport|Maupiti Airport|PF|-16.43|-152.24|0
MAZ|Eugenio Maria De Hostos Airport|Mayaguez|PR|18.26|-67.15|0
MBD|Mmabatho International Airport|Mafeking|ZA|-25.8|25.55|0
MBE|Monbetsu Airport|Monbetsu|JP|44.3|143.4|0
MBI|Songwe Airport|Mbeya|TZ|-8.92|33.27|0
MBS|MBS International Airport|Freeland|US|43.53|-84.08|0
MBT|Moises R. Espinosa Airport|Masbate|PH|12.37|123.63|0
MBW|Melbourne Moorabbin Airport|Melbourne|AU|-37.98|145.1|0
MBX|Maribor Edvard Rusjan Airport|Maribor|SI|46.48|15.69|0
MCE|Merced Regional Macready Field|Merced|US|37.28|-120.51|0
MCG|McGrath Airport|McGrath|US|62.95|-155.61|0
MCK|McCook Ben Nelson Regional Airport|McCook|US|40.21|-100.59|0
MCN|Middle Georgia Regional Airport|Macon|US|32.69|-83.65|0
MCP|Macapá - Alberto Alcolumbre International Airport|Macapá|BR|0.05|-51.07|0
MCW|Mason City Municipal Airport|Mason City|US|43.16|-93.33|0
MDG|Mudanjiang Hailang International Airport|Mudanjiang|CN|44.53|129.57|0
MDI|Makurdi Airport|Makurdi|NG|7.7|8.61|0
MDK|Mbandaka Airport|Mbandaka|CD|0.02|18.29|0
MDQ|Ástor Piazzola International Airport|Mar del Plata|AR|-37.93|-57.57|0
MDT|Harrisburg International Airport|Harrisburg|US|40.19|-76.76|0
MDU|Mendi Airport|Mendi|PG|-6.15|143.66|0
MEB|Melbourne Essendon Airport|Essendon Fields|AU|-37.73|144.9|0
MEC|Eloy Alfaro International Airport|Manta|EC|-0.95|-80.68|0
MEE|Maré Airport|Maré|NC|-21.48|168.04|0
MEG|Malanje Airport|Malanje|AO|-9.53|16.31|0
MEH|Mehamn Airport|Mehamn|NO|71.03|27.83|0
MEI|Key Field / Meridian Regional Airport|Meridian|US|32.33|-88.75|0
MEQ|Cut Nyak Dhien Airport|Kuala Pesisir|ID|4.04|96.25|0
MFE|McAllen Miller International Airport|McAllen|US|26.18|-98.24|0
MFK|Matsu Beigan Airport|Matsu (Beigan)|TW|26.22|120.0|0
MFR|Rogue Valley International-Medford Airport|Medford|US|42.37|-122.87|0
MGB|Mount Gambier Airport|Mount Gambier|AU|-37.74|140.78|0
MGC|Michigan City Municipal Airport|Michigan City|US|41.7|-86.82|0
MGF|Regional de Maringá - Sílvio Name Júnior Airport|Maringá|BR|-23.48|-52.02|0
MGH|Margate Airport|Margate|ZA|-30.86|30.34|0
MGM|Montgomery Regional (Dannelly Field) Airport|Montgomery|US|32.3|-86.39|0
MGW|Morgantown Municipal Airport Walter L. (Bill) Hart Field|Morgantown|US|39.64|-79.92|0
MGZ|Myeik Airport|Mkeik|MM|12.44|98.62|0
MHG|Mannheim-City Airport|Mannheim|DE|49.47|8.51|0
MHH|Leonard M. Thompson International Airport|Marsh Harbour|BS|26.51|-77.08|0
MHK|Manhattan Regional Airport|Manhattan|US|39.14|-96.67|0
MHQ|Mariehamn Airport|Mariehamn|FI|60.12|19.9|0
MHT|Manchester-Boston Regional Airport|Manchester|US|42.93|-71.44|0
MHU|Mount Hotham Airport|Mount Hotham|AU|-37.05|147.33|0
MIG|Mianyang Nanjiao Airport|Mianyang (Fucheng)|CN|31.43|104.74|0
MII|Frank Miloye Milenkowichi–Marília State Airport|Marília|BR|-22.2|-49.93|0
MIM|Merimbula Airport|Merimbula|AU|-36.91|149.9|0
MIR|Monastir Habib Bourguiba International Airport|Monastir|TN|35.76|10.75|0
MJF|Mosjøen Airport, Kjærstad|Mosjøen|NO|65.78|13.21|0
MJK|Shark Bay Airport|Denham|AU|-25.9|113.58|0
MJM|Mbuji Mayi Airport|Mbuji Mayi|CD|-6.12|23.57|0
MJT|Mytilene International Airport|Mytilene|GR|39.06|26.6|0
MJZ|Mirny Airport|Mirny|RU|62.53|114.04|0
MKG|Muskegon County Airport|Muskegon|US|43.17|-86.24|0
MKK|Molokai Airport|Kaunakakai|US|21.15|-157.1|0
MKL|McKellar-Sipes Regional Airport|Jackson|US|35.6|-88.92|0
MKM|Mukah Airport|Mukah|MY|2.88|112.04|0
MKP|Makemo Airport|Makemo|PF|-16.58|-143.66|0
MKQ|Mopah International Airport|Merauke|ID|-8.52|140.42|0
MKR|Meekatharra Airport|Meekatharra Airport|AU|-26.61|118.55|0
MKU|Makokou Airport|Makokou|GA|0.58|12.89|0
MKW|Rendani Airport|Manokwari|ID|-0.89|134.05|0
MKY|Mackay Airport|Mackay|AU|-21.17|149.18|0
MKZ|Malacca International Airport|Malacca|MY|2.27|102.25|0
MLB|Melbourne Orlando International Airport|Melbourne|US|28.1|-80.64|0
MLG|Abdul Rachman Saleh Airport|Malang|ID|-7.93|112.71|0
MLI|Quad City International Airport|Moline|US|41.45|-90.51|0
MLN|Melilla Airport|Melilla|ES|35.28|-2.96|0
MLU|Monroe Regional Airport|Monroe|US|32.51|-92.04|0
MLW|Spriggs Payne Airport|Monrovia|LR|6.29|-10.76|0
MLX|Malatya Erhaç Airport|Malatya|TR|38.44|38.09|0
MMB|Memanbetsu Airport|Ōzora|JP|43.88|144.16|0
MMD|Minamidaito Airport|Minamidaito|JP|25.85|131.26|0
MME|Teesside International Airport|Darlington, Durham|GB|54.51|-1.43|0
MMG|Mount Magnet Airport|Mount Magnet Airport|AU|-28.12|117.84|0
MMH|Mammoth Yosemite Airport|Mammoth Lakes|US|37.63|-118.84|0
MMJ|Shinshu-Matsumoto Airport|Matsumoto|JP|36.17|137.92|0
MMO|Maio Airport|Vila do Maio|CV|15.16|-23.21|0
MMY|Miyako Airport|Miyakojima|JP|24.78|125.29|0
MNC|Nacala International Airport|Nacala|MZ|-14.49|40.71|0
MNG|Maningrida Airport|Maningrida|AU|-12.06|134.23|0
MNJ|Mananjary Airport|Mananjary|MG|-21.2|48.36|0
MNX|Manicoré Airport|Manicoré|BR|-5.81|-61.28|0
MOB|Mobile Regional Airport|Mobile|US|30.69|-88.24|0
MOC|Mário Ribeiro Airport|Montes Claros|BR|-16.71|-43.82|0
MOG|Mong Hsat Airport|Mong Hsat|MM|20.52|99.26|0
MOL|Molde Airport, Årø|Årø|NO|62.74|7.26|0
MOQ|Morondava Airport|Morondava|MG|-20.28|44.32|0
MOT|Minot International Airport|Minot|US|48.26|-101.28|0
MOV|Moranbah Airport|Moranbah|AU|-22.06|148.08|0
MOZ|Moorea Temae Airport|Moorea-Maiao|PF|-17.49|-149.76|0
MPA|Katima Mulilo Airport|Mpacha|NA|-17.63|24.18|0
MPH|Godofredo P. Ramos Airport|Caticlan|PH|11.92|121.95|0
MPW|Mariupol International Airport|Mariupol|UA|47.08|37.45|0
MPY|Maripasoula Airport|Maripasoula|GF|3.66|-54.04|0
MQJ|Moma Airport|Khonuu|RU|66.45|143.26|0
MQL|Mildura Airport|Mildura|AU|-34.23|142.09|0
MQM|Mardin Airport|Mardin|TR|37.22|40.63|0
MQN|Mo i Rana Airport, Røssvoll|Mo i Rana|NO|66.36|14.3|0
MQS|Mustique Airport|Lovell|VC|12.89|-61.18|0
MQT|Marquette/Sawyer International Airport|Gwinn|US|46.35|-87.4|0
MQX|Mekele Alula Aba Nega Airport|Mekele|ET|13.47|39.53|0
MRE|Mara Serena Lodge Airstrip|Serena|KE|-1.4|35.01|0
MRI|Merrill Field|Anchorage|US|61.21|-149.84|0
MRX|Mahshahr Airport|Mahshahr|IR|30.56|49.15|0
MRY|Monterey Regional Airport|Monterey|US|36.59|-121.84|0
MRZ|Moree Airport|Moree|AU|-29.5|149.85|0
MSJ|Misawa Airport / Misawa Air Base|Misawa|JP|40.7|141.37|0
MSL|Northwest Alabama Regional Airport|Muscle Shoals|US|34.75|-87.61|0
MSN|Dane County Regional Truax Field|Madison|US|43.14|-89.34|0
MSO|Missoula Montana Airport|Missoula|US|46.92|-114.09|0
MSR|Muş Airport|Muş|TR|38.75|41.66|0
MSS|Massena International Airport Richards Field|Massena|US|44.94|-74.84|0
MSZ|Welwitschia Mirabilis International Airport|Moçâmedes|AO|-15.26|12.15|0
MTJ|Montrose Regional Airport|Montrose|US|38.51|-107.89|0
MTR|Los Garzones Airport|Montería|CO|8.82|-75.83|0
MTT|Minatitlán/Coatzacoalcos International Airport|Cosoleacaque|MX|18.1|-94.58|0
MUA|Munda Airport|Munda|SB|-8.33|157.26|0
MUE|Waimea Kohala Airport|Waimea (Kamuela)|US|20.0|-155.67|0
MUN|José Tadeo Monagas International Airport|Maturín|VE|9.75|-63.15|0
MUR|Marudi Airport|Marudi|MY|4.18|114.33|0
MVB|M'Vengue El Hadj Omar Bongo Ondimba International Airport|Franceville|GA|-1.66|13.44|0
MVF|Dix-Sept Rosado Airport|Mossoró|BR|-5.2|-37.36|0
MVP|Fabio Alberto Leon Bentley Airport|Mitú|CO|1.25|-70.23|0
MVQ|Mogilev Airport|Mogilev|BY|53.95|30.1|0
MVR|Salak Airport|Maroua|CM|10.45|14.26|0
MVT|Mataiva Airport|Mataiva Airport|PF|-14.87|-148.72|0
MWA|Veterans Airport of Southern Illinois|Marion|US|37.75|-89.02|0
MWL|Mineral Wells Regional Airport|Mineral Wells|US|32.78|-98.06|0
MXL|General Rodolfo Sánchez Taboada International Airport|Mexicali|MX|32.63|-115.24|0
MXV|Mörön Airport|Mörön|MN|49.66|100.1|0
MXX|Mora Airport|Mora|SE|60.96|14.51|0
MYA|Moruya Airport|Moruya|AU|-35.9|150.14|0
MYD|Malindi International Airport|Malindi|KE|-3.23|40.1|0
MYE|Miyakejima Airport|Miyakejima|JP|34.07|139.56|0
MYG|Mayaguana Airport|Abraham Bay Settlement|BS|22.38|-73.01|0
MYL|McCall Municipal Airport|McCall|US|44.89|-116.1|0
MYP|Mary International Airport|Mary|TM|37.62|61.9|0
MYQ|Mysore Airport|Mysore|IN|12.23|76.65|0
MYT|Myitkyina Airport|Myitkyina|MM|25.38|97.35|0
MYU|Mekoryuk Airport|Mekoryuk|US|60.37|-166.27|0
MYW|Mtwara Airport|Mtwara|TZ|-10.34|40.18|0
MYY|Miri Airport|Miri|MY|4.32|113.99|0
MZI|Mopti Airport|Sévaré|ML|14.51|-4.08|0
MZL|La Nubia Airport|Manizales|CO|5.03|-75.46|0
MZO|Sierra Maestra International Airport|Manzanillo|CU|20.29|-77.09|0
MZQ|Mkuze Airport|Mkuze|ZA|-27.63|32.04|0
MZS|Moradabad Airport|Moradabad|IN|28.82|78.92|0
MZV|Mulu Airport|Mulu|MY|4.05|114.81|0
MZW|Mecheria Airport|Mecheria|DZ|33.54|-0.24|0
NAA|Narrabri Airport|Narrabri|AU|-30.32|149.83|0
NAH|Naha Airport|Tabukan Utara, Sangihe Islands|ID|3.68|125.53|0
NAL|Nalchik Airport|Nalchik|RU|43.51|43.64|0
NAM|Namniwel Airport|Namniwel|ID|-3.14|126.98|0
NAQ|Qaanaaq Airport|Qaanaaq|GL|77.49|-69.39|0
NAW|Narathiwat Airport|Narathiwat Airport|TH|6.52|101.74|0
NBC|Begishevo Airport|Nizhnekamsk|RU|55.56|52.09|0
NBE|Enfidha - Hammamet International Airport|Enfidha|TN|36.08|10.44|0
NBS|Changbaishan Airport|Baishan|CN|42.07|127.6|0
NCA|North Caicos Airport|North Caicos|TC|21.92|-71.94|0
NCY|Annecy Meythet airport|Annecy|FR|45.93|6.1|0
NDC|Nanded Airport|Nanded|IN|19.18|77.32|0
NDU|Rundu Airport|Rundu|NA|-17.96|19.72|0
NEC|Necochea Airport|Necochea|AR|-38.49|-58.82|0
NER|Chulman Airport|Neryungri|RU|56.91|124.91|0
NEV|Vance W. Amory International Airport|Charlestown|KN|17.21|-62.59|0
NGE|N'Gaoundéré Airport|N'Gaoundéré|CM|7.36|13.56|0
NGQ|Ngari Gunsa Airport|Shiquanhe|CN|32.1|80.05|0
NHV|Nuku Hiva Airport|Nuku Hiva|PF|-8.8|-140.23|0
NKM|Nagoya Airport / JASDF Komaki Air Base|Nagoya|JP|35.26|136.92|0
NKT|Şırnak Şerafettin Elçi Airport|Şırnak|TR|37.36|42.06|0
NLD|Quetzalcóatl International Airport|Nuevo Laredo|MX|27.44|-99.57|0
NLH|Ninglang Luguhu Airport|Ninglang|CN|27.54|100.76|0
NLI|Nikolayevsk-na-Amure Airport|Nikolayevsk-na-Amure Airport|RU|53.15|140.65|0
NLK|Norfolk Island International Airport|Burnt Pine|NF|-29.04|167.94|0
NLT|Xinyuan Nalati Airport|Xinyuan|CN|43.43|83.38|0
NMF|Maafaru International Airport|Noonu Atoll|MV|5.82|73.47|0
NNM|Naryan Mar Airport|Naryan Mar|RU|67.64|53.12|0
NNT|Nan Airport|Nan Airport|TH|18.81|100.78|0
NOB|Nosara Airport|Nicoya|CR|9.98|-85.65|0
NOJ|Noyabrsk Airport|Noyabrsk|RU|63.18|75.27|0
NOP|Sinop Airport|Sinop|TR|42.02|35.07|0
NOV|Albano Machado Airport|Huambo|AO|-12.81|15.76|0
NOZ|Spichenkovo Airport|Novokuznetsk|RU|53.81|86.88|0
NPE|Hawke's Bay Airport|Napier|NZ|-39.47|176.87|0
NPL|New Plymouth Airport|New Plymouth|NZ|-39.01|174.18|0
NPO|Nanga Pinoh Airport|Nanga Pinoh-Borneo Island|ID|-0.35|111.75|0
NPT|Newport State Airport|Newport|US|41.53|-71.28|0
NQY|Cornwall Airport Newquay|Newquay|GB|50.44|-5.0|0
NRA|Narrandera Airport|Narrandera|AU|-34.7|146.51|0
NRK|Norrköping Airport|Norrköping|SE|58.59|16.25|0
NRR|José Aponte de la Torre Airport|Ceiba|PR|18.25|-65.64|0
NSH|Nowshahr Airport|Nowshahr|IR|36.66|51.46|0
NSN|Nelson Airport|Nelson|NZ|-41.3|173.22|0
NST|Nakhon Si Thammarat Airport|Nakhon Si Thammarat|TH|8.54|99.94|0
NTG|Nantong Xingdong International Airport|Nantong (Tongzhou)|CN|32.07|120.98|0
NTN|Normanton Airport|Normanton|AU|-17.68|141.07|0
NTQ|Noto Satoyama Airport|Wajima|JP|37.29|136.96|0
NTX|Ranai Airport|Ranai-Natuna Besar Island|ID|3.91|108.39|0
NUI|Nuiqsut Airport|Nuiqsut|US|70.21|-151.01|0
NUX|Novy Urengoy Airport|Novy Urengoy|RU|66.07|76.52|0
NVA|Benito Salas Airport|Neiva|CO|2.95|-75.29|0
NVI|Navoi International Airport|Navoi|UZ|40.12|65.17|0
NWI|Norwich Airport|Norwich, Norfolk|GB|52.68|1.28|0
NYA|Nyagan Airport|Nyagan|RU|62.11|65.61|0
NYI|Sunyani Airport|Sunyani|GH|7.36|-2.33|0
NYK|Nanyuki Civil Airport|Gathiuru|KE|-0.06|37.04|0
NYM|Nadym Airport|Nadym|RU|65.48|72.7|0
NZC|Maria Reiche Neuman Airport|Nazca|PE|-14.85|-74.96|0
NZH|Manzhouli Xijiao Airport|Manzhouli|CN|49.57|117.33|0
NZL|Zhalantun Genghis Khan Airport|Zhalantun|CN|47.87|122.77|0
OAJ|Albert J Ellis Airport|Richlands|US|34.83|-77.61|0
OBO|Tokachi-Obihiro Airport|Obihiro|JP|42.73|143.22|0
OCC|Francisco De Orellana Airport|Coca|EC|-0.46|-76.99|0
OCE|Ocean City Municipal Airport|Ocean City|US|38.31|-75.12|0
OCJ|Ian Fleming International Airport|Boscobel|JM|18.4|-76.97|0
ODB|Córdoba Airport|Córdoba|ES|37.84|-4.85|0
OER|Örnsköldsvik Airport|Örnsköldsvik|SE|63.41|18.99|0
OGD|Ogden Hinckley Airport|Ogden|US|41.2|-112.01|0
OGL|Eugene F. Correia International Airport|Ogle|GY|6.81|-58.11|0
OGN|Yonaguni Airport|Yonaguni|JP|24.47|122.98|0
OGS|Ogdensburg International Airport|Ogdensburg|US|44.68|-75.47|0
OGU|Ordu–Giresun Airport|Ordu|TR|40.97|38.09|0
OGX|Ain Beida Airport|Ouargla|DZ|31.92|5.41|0
OGZ|Vladikavkaz Beslan International Airport|Beslan|RU|43.21|44.61|0
OHE|Mohe Gulian Airport|Mohe|CN|52.92|122.42|0
OHO|Okhotsk Airport|Okhotsk|RU|59.41|143.06|0
OIM|Oshima Airport|Izu Oshima|JP|34.78|139.36|0
OIR|Okushiri Airport|Okushiri Island|JP|42.07|139.43|0
OIT|Oita Airport|Oita|JP|33.48|131.74|0
OKD|Sapporo Okadama Airport|Sapporo|JP|43.12|141.38|0
OKE|Okinoerabu Airport|Wadomari|JP|27.43|128.71|0
OKI|Oki Global Geopark Airport|Okinoshima|JP|36.18|133.32|0
OKL|Oksibil Airport|Oksibil|ID|-4.91|140.63|0
OKY|Oakey Army Aviation Centre|Oakey Army Aviation Centre|AU|-27.41|151.74|0
OLA|Ørland Airport|Ørland|NO|63.7|9.6|0
OLF|L M Clayton Airport|Wolf Point|US|48.09|-105.57|0
OLM|Olympia Regional Airport|Olympia|US|46.97|-122.9|0
OLZ|Olyokminsk Airport|Olyokminsk|RU|60.4|120.48|0
OMD|Oranjemund Airport|Oranjemund|NA|-28.59|16.45|0
OME|Nome Airport|Nome|US|64.51|-165.45|0
OMH|Urmia Airport|Urmia|IR|37.67|45.07|0
OMN|Zomin Airport|Zomin|UZ|40.01|68.41|0
OND|Ondangwa Airport|Ondangwa|NA|-17.88|15.95|0
ONJ|Odate Noshiro Airport|Kitaakita|JP|40.19|140.37|0
ONQ|Zonguldak Çaycuma Airport|Zonguldak|TR|41.51|32.09|0
ONX|Enrique Adolfo Jimenez Airport|Colón|PA|9.36|-79.87|0
OOM|Cooma Snowy Mountains Airport|Cooma|AU|-36.3|148.97|0
OPF|Miami-Opa Locka Executive Airport|Miami|US|25.91|-80.28|0
OPU|Balimo Airport|Balimo|PG|-8.05|142.93|0
ORB|Örebro Airport|Örebro|SE|59.22|15.04|0
ORH|Worcester Regional Airport|Worcester|US|42.27|-71.88|0
ORT|Northway Airport|Northway|US|62.96|-141.93|0
OSD|Åre Östersund Airport|Östersund|SE|63.19|14.5|0
OSI|Osijek Airport|Osijek(Klisa)|HR|45.46|18.81|0
OSW|Orsk Airport|Orsk|RU|51.07|58.6|0
OTH|Southwest Oregon Regional Airport|North Bend|US|43.42|-124.25|0
OTZ|Ralph Wien Memorial Airport|Kotzebue|US|66.88|-162.6|0
OUZ|Tazadit Airport|Zouérate|MR|22.76|-12.48|0
OVS|Sovetskiy Airport|Sovetskiy|RU|61.33|63.6|0
OWB|Owensboro Daviess County Airport|Owensboro|US|37.74|-87.17|0
OYE|Oyem Airport|Oyem|GA|1.54|11.58|0
OZC|Labo Airport|Ozamiz|PH|8.18|123.84|0
PAB|Bilaspur Airport|Bilaspur|IN|21.99|82.11|0
PAC|Marcos A. Gelabert International Airport|Albrook|PA|8.97|-79.56|0
PAE|Seattle Paine Field International Airport|Everett|US|47.91|-122.28|0
PAG|Pagadian Airport|Pagadian|PH|7.83|123.46|0
PAH|Barkley Regional Airport|Paducah|US|37.06|-88.77|0
PAT|Jay Prakash Narayan Airport|Patna|IN|25.59|85.09|0
PAV|Paulo Afonso Airport|Paulo Afonso|BR|-9.4|-38.25|0
PAZ|El Tajín National Airport|Poza Rica|MX|20.6|-97.46|0
PBD|Porbandar Airport|Porbandar|IN|21.65|69.66|0
PBG|Plattsburgh International Airport|Plattsburgh|US|44.65|-73.47|0
PBO|Paraburdoo Airport|Paraburdoo|AU|-23.17|117.75|0
PBR|Puerto Barrios Airport|Puerto Barrios|GT|15.73|-88.58|0
PBU|Putao Airport|Putao|MM|27.33|97.43|0
PCP|Principe Airport|São Tomé & Príncipe|ST|1.66|7.41|0
PCR|German Olano Airport|Puerto Carreño|CO|6.18|-67.49|0
PDA|Obando Cesar Gaviria Trujillo Airport|Puerto Inírida|CO|3.85|-67.91|0
PDK|DeKalb Peachtree Airport|Atlanta|US|33.88|-84.3|0
PDO|Pendopo Airport|Talang Gudang-Sumatra Island|ID|-3.29|103.88|0
PDP|Capitan Corbeta CA Curbelo International Airport|Punta del Este|UY|-34.86|-55.09|0
PDS|Piedras Negras International Airport|Piedras Negras|MX|28.63|-100.54|0
PDT|Eastern Oregon Regional Airport at Pendleton|Pendleton|US|45.7|-118.84|0
PEI|Matecaña International Airport|Pereira|CO|4.81|-75.74|0
PEM|Padre Aldamiz International Airport|Puerto Maldonado|PE|-12.61|-69.23|0
PES|Petrozavodsk Airport|Petrozavodsk|RU|61.89|34.15|0
PET|João Simões Lopes Neto International Airport|Pelotas|BR|-31.72|-52.33|0
PEX|Pechora Airport|Pechora|RU|65.12|57.13|0
PEZ|Penza Airport|Penza|RU|53.11|45.02|0
PFB|Lauro Kurtz Airport|Passo Fundo|BR|-28.24|-52.33|0
PGA|Page Municipal Airport|Page|US|36.92|-111.45|0
PGD|Punta Gorda Airport|Punta Gorda|US|26.92|-81.99|0
PGF|Perpignan-Rivesaltes (Llabanère) Airport|Perpignan/Rivesaltes|FR|42.74|2.87|0
PGH|Pantnagar Airport|Pantnagar|IN|29.03|79.47|0
PGK|Depati Amir Airport|Pangkal Pinang|ID|-2.16|106.14|0
PGU|Persian Gulf International Airport|Khiyaroo|IR|27.38|52.74|0
PGV|Pitt-Greenville Airport|Greenville|US|35.64|-77.38|0
PGZ|Ponta Grossa Airport - Comandante Antonio Amilton Beraldo|Ponta Grossa|BR|-25.18|-50.14|0
PHB|Parnaíba - Prefeito Doutor João Silva Filho International Airport|Parnaíba|BR|-2.89|-41.73|0
PHF|Newport News Williamsburg International Airport|Newport News|US|37.13|-76.49|0
PHG|Port Harcourt City Airport / Port Harcourt Air Force Base|Port Harcourt|NG|4.85|7.02|0
PHS|Phitsanulok Airport|Phitsanulok|TH|16.78|100.28|0
PHW|Hendrik Van Eck Airport|Phalaborwa|ZA|-23.94|31.16|0
PHY|Phetchabun Airport|Phetchabun Airport|TH|16.68|101.19|0
PIA|General Wayne A. Downing Peoria International Airport|Peoria|US|40.66|-89.69|0
PIB|Hattiesburg Laurel Regional Airport|Moselle|US|31.47|-89.34|0
PIH|Pocatello Regional Airport|Pocatello|US|42.91|-112.6|0
PIR|Pierre Regional Airport|Pierre|US|44.38|-100.29|0
PIS|Poitiers-Biard Airport|Poitiers/Biard|FR|46.59|0.31|0
PIU|PAF Captain Guillermo Concha Iberico International Airport|Piura|PE|-5.21|-80.62|0
PIX|Pico Airport|Pico Island|PT|38.55|-28.44|0
PIZ|Point Lay LRRS Airport|Point Lay|US|69.73|-163.01|0
PJM|Puerto Jimenez Airport|Puerto Jimenez|CR|8.53|-83.3|0
PKB|Mid Ohio Valley Regional Airport|Parkersburg (Williamstown)|US|39.35|-81.44|0
PKE|Parkes Airport|Parkes|AU|-33.13|148.24|0
PKR|Pokhara Domestic Airport|Pokhara|NP|28.2|83.98|0
PKU|Sultan Syarif Kasim II International Airport / Roesmin Nurjadin AFB|Pekanbaru|ID|0.46|101.44|0
PKV|Princess Olga Pskov International Airport|Pskov|RU|57.78|28.39|0
PKY|Tjilik Riwut Airport|Palangkaraya|ID|-2.23|113.94|0
PLJ|Placencia Airport|Placencia|BZ|16.54|-88.36|0
PLM|Sultan Mahmud Badaruddin II Airport|Palembang|ID|-2.9|104.7|0
PLN|Pellston Regional Airport of Emmet County Airport|Pellston|US|45.57|-84.8|0
PLO|Port Lincoln Airport|Port Lincoln|AU|-34.61|135.88|0
PLW|Mutiara - SIS Al-Jufrie Airport|Palu|ID|-0.92|119.91|0
PMF|Parma Airport|Parma (PR)|IT|44.83|10.3|0
PMG|Ponta Porã Airport|Ponta Porã|BR|-22.55|-55.7|0
PMQ|Perito Moreno Jalil Hamer Airport|Perito Moreno|AR|-46.54|-70.98|0
PMR|Palmerston North Airport|Palmerston North|NZ|-40.32|175.62|0
PMW|Brigadeiro Lysias Rodrigues Airport|Palmas|BR|-10.29|-48.36|0
PMY|El Tehuelche Airport|Puerto Madryn|AR|-42.76|-65.1|0
PNA|Pamplona Airport|Pamplona|ES|42.77|-1.65|0
PNI|Pohnpei International Airport|Pohnpei Island|FM|6.99|158.21|0
PNL|Pantelleria Airport|Pantelleria (TP)|IT|36.82|11.97|0
PNP|Girua Airport|Popondetta|PG|-8.8|148.31|0
PNT|Lieutenant Julio Gallardo Airport|Puerto Natales|CL|-51.67|-72.53|0
PNY|Pondicherry Airport|Puducherry (Pondicherry)|IN|11.97|79.81|0
PNZ|Senador Nilo Coelho Airport|Petrolina|BR|-9.36|-40.57|0
POL|Pemba Airport|Pemba|MZ|-12.99|40.52|0
POP|Gregorio Luperon International Airport|Puerto Plata|DO|19.76|-70.57|0
POR|Pori Airport|Pori|FI|61.46|21.8|0
PPB|Presidente Prudente Airport|Presidente Prudente|BR|-22.18|-51.42|0
PPN|Guillermo León Valencia Airport|Popayán|CO|2.45|-76.61|0
PPP|Proserpine Whitsunday Coast Airport|Proserpine|AU|-20.49|148.55|0
PQI|Presque Isle International Airport|Presque Isle|US|46.69|-68.04|0
PQQ|Port Macquarie Airport|Port Macquarie|AU|-31.44|152.86|0
PRA|General Urquiza Airport|Parana|AR|-31.79|-60.48|0
PRC|Prescott Regional Airport - Ernest A. Love Field|Prescott|US|34.65|-112.42|0
PRI|Praslin Island Airport|Praslin Island|SC|-4.32|55.69|0
PRM|Portimão Airport|Portimão|PT|37.15|-8.58|0
PSC|Tri Cities Airport|Pasco|US|46.26|-119.12|0
PSE|Mercedita International Airport|Ponce|PR|18.01|-66.56|0
PSG|Petersburg James A Johnson Airport|Petersburg|US|56.8|-132.95|0
PSM|Portsmouth International Airport at Pease|Portsmouth|US|43.08|-70.82|0
PSO|Antonio Nariño Airport|Chachagüí|CO|1.4|-77.29|0
PSS|Libertador Gral D Jose De San Martin Airport|Posadas|AR|-27.39|-55.97|0
PSU|Pangsuma Airport|Putussibau-Borneo Island|ID|0.83|112.94|0
PSZ|Capitán Av. Salvador Ogaya G. airport|Puerto Suárez|BO|-18.98|-57.82|0
PTH|Port Heiden Airport|Port Heiden|US|56.96|-158.63|0
PTJ|Portland Airport|Portland Airport|AU|-38.32|141.47|0
PTU|Platinum Airport|Platinum|US|59.02|-161.83|0
PUB|Pueblo Memorial Airport|Pueblo|US|38.29|-104.5|0
PUD|Puerto Deseado Airport|Puerto Deseado|AR|-47.74|-65.9|0
PUF|Pau Pyrénées Airport|Pau/Pyrénées (Uzein)|FR|43.38|-0.42|0
PUG|Port Augusta Airport|Port Augusta Airport|AU|-32.51|137.72|0
PUU|Tres De Mayo Airport|Puerto Asís|CO|0.51|-76.5|0
PUW|Pullman-Moscow Regional Airport|Pullman|US|46.74|-117.11|0
PUZ|Puerto Cabezas Airport|Puerto Cabezas|NI|14.05|-83.39|0
PVA|El Embrujo Airport|Providencia|CO|13.36|-81.36|0
PVK|Aktion National Airport|Preveza|GR|38.93|20.77|0
PVU|Provo Municipal Airport|Provo|US|40.22|-111.72|0
PWE|Pevek Airport|Apapelgino|RU|69.78|170.6|0
PXM|Puerto Escondido International Airport|Puerto Escondido|MX|15.88|-97.09|0
PXO|Porto Santo Airport|Vila Baleira|PT|33.07|-16.35|0
PXR|Surin Airport|Surin|TH|14.87|103.5|0
PXU|Pleiku Airport|Pleiku|VN|14.0|108.02|0
PYJ|Polyarny Airport|Yakutia|RU|66.4|112.03|0
PZB|Pietermaritzburg Airport|Pietermaritzburg|ZA|-29.65|30.4|0
PZH|Zhob Airport|Fort Sandeman|PK|31.36|69.46|0
PZI|Panzhihua Bao'anying Airport|Panzhihua (Renhe)|CN|26.54|101.8|0
QBC|Bella Coola Airport|Bella Coola|CA|52.39|-126.6|0
QOW|Sam Mbakwe International Cargo Airport|Owerri|NG|5.43|7.21|0
QRW|Warri Airport|Okpe|NG|5.6|5.82|0
QSF|Ain Arnat Airport|Sétif|DZ|36.18|5.33|0
QSR|Salerno Costa d'Amalfi Airport|Salerno|IT|40.62|14.91|0
QSZ|Shache Airport|Shache|CN|38.25|77.06|0
QUO|Akwa Ibom International Airport|Uyo|NG|4.87|8.09|0
RAB|Tokua Airport|Kokopo|PG|-4.34|152.38|0
RAE|Arar Domestic Airport|Arar|SA|30.91|41.14|0
RAH|Rafha Domestic Airport|Rafha|SA|29.63|43.49|0
RAO|Leite Lopes Airport|Ribeirão Preto|BR|-21.13|-47.77|0
RAP|Rapid City Regional Airport|Rapid City|US|44.05|-103.06|0
RAS|Sardar-e-Jangal Airport|Rasht|IR|37.32|49.62|0
RBY|Ruby Airport|Ruby|US|64.73|-155.47|0
RCB|Richards Bay Airport|Richards Bay|ZA|-28.74|32.09|0
RCH|Almirante Padilla Airport|Riohacha|CO|11.53|-72.93|0
RDD|Redding Municipal Airport|Redding|US|40.51|-122.29|0
RDM|Roberts Field|Redmond|US|44.25|-121.15|0
RDO|Warsaw Radom Airport|Radom|PL|51.39|21.21|0
RDP|Kazi Nazrul Islam Airport|Durgapur|IN|23.62|87.24|0
RDZ|Rodez–Aveyron Airport|Rodez/Marcillac|FR|44.41|2.48|0
REG|Reggio Calabria Airport|Reggio Calabria|IT|38.07|15.65|0
REL|Almirante Marco Andres Zar Airport|Rawson|AR|-43.21|-65.27|0
REN|Orenburg Central Airport|Orenburg|RU|51.79|55.46|0
RER|Retalhuleu Airport|Retalhuleu|GT|14.52|-91.7|0
REW|Rewa Airport, Chorhata, REWA|Rewa|IN|24.5|81.22|0
REX|General Lucio Blanco International Airport|Reynosa|MX|26.01|-98.23|0
RFD|Chicago Rockford International Airport|Chicago/Rockford|US|42.2|-89.1|0
RFP|Raiatea Airport|Uturoa|PF|-16.72|-151.47|0
RGA|Gobernador Ramón Trejo Noel International Airport|Rio Grande|AR|-53.78|-67.75|0
RGI|Rangiroa Airport|Rangiroa Airport|PF|-14.95|-147.66|0
RGO|Orang (Chongjin) Airport|Hoemun-ri|KP|41.43|129.65|0
RHD|Termas de Río Hondo international Airport|Termas de Río Hondo|AR|-27.5|-64.94|0
RHI|Rhinelander Oneida County Airport|Rhinelander|US|45.63|-89.47|0
RIA|Santa Maria Airport|Santa Maria|BR|-29.71|-53.69|0
RIB|Capitán Av. Selin Zeitun Lopez Airport|Riberalta|BO|-11.01|-66.08|0
RIS|Rishiri Airport|Rishiri|JP|45.24|141.19|0
RIW|Central Wyoming Regional Airport|Riverton|US|43.06|-108.46|0
RIZ|Rizhao Shanzihe Airport|Rizhao (Donggang)|CN|35.41|119.32|0
RJA|Rajahmundry Airport|Madhurapudi|IN|17.11|81.81|0
RJH|Shah Makhdum Airport|Rajshahi|BD|24.44|88.62|0
RJN|Rafsanjan Airport|Rafsanjan|IR|30.3|56.05|0
RKD|Knox County Regional Airport|Rockland|US|44.06|-69.1|0
RKE|Copenhagen Roskilde Airport|Roskilde|DK|55.59|12.13|0
RKS|Southwest Wyoming Regional Airport|Rock Springs|US|41.59|-109.07|0
RKV|Reykjavík Domestic Airport|Reykjavík|IS|64.13|-21.94|0
RLG|Rostock-Laage Airport|Laage|DE|53.92|12.28|0
RLK|Bayannur Tianjitai Airport|Bayannur|CN|40.93|107.74|0
RMA|Roma Airport|Roma|AU|-26.55|148.77|0
RMZ|Tobolsk Remezov Airport|Tobolsk|RU|58.06|68.35|0
RNB|Ronneby Airport|Ronneby|SE|56.27|15.27|0
RNJ|Yoron Airport|Yoron|JP|27.04|128.4|0
RNN|Bornholm Airport|Rønne|DK|55.06|14.76|0
RNS|Rennes-Saint-Jacques Airport|Saint-Jacques-de-la-Lande, Ille-et-Vilaine|FR|48.07|-1.73|0
ROA|Roanoke–Blacksburg Regional Airport|Roanoke|US|37.33|-79.98|0
ROI|Roi Et Airport|Roi Et|TH|16.12|103.77|0
ROK|Rockhampton Airport|Rockhampton|AU|-23.38|150.48|0
ROO|Maestro Marinho Franco Airport|Rondonópolis|BR|-16.58|-54.72|0
ROT|Rotorua Regional Airport|Rotorua|NZ|-38.11|176.32|0
ROW|Roswell Air Center Airport|Roswell|US|33.3|-104.53|0
RPR|Swami Vivekananda Airport|Raipur|IN|21.18|81.74|0
RQA|Ruoqiang Loulan Airport|Ruoqiang Town|CN|38.97|88.01|0
RRG|Sir Charles Gaetan Duval Airport|Port Mathurin|MU|-19.76|63.36|0
RRJ|Jacarepaguá - Roberto Marinho Airport|Rio de Janeiro|BR|-22.99|-43.37|0
RRS|Røros Airport|Røros|NO|62.58|11.34|0
RSA|Santa Rosa Airport|Santa Rosa|AR|-36.59|-64.28|0
RSD|Rock Sound International Airport|Rock Sound|BS|24.89|-76.18|0
RST|Rochester International Airport|Rochester|US|43.91|-92.5|0
RSU|Yeosu Airport|Yeosu|KR|34.84|127.62|0
RUA|Arua Airport|Arua|UG|3.05|30.91|0
RUR|Rurutu Airport|Rurutu Airport|PF|-22.43|-151.36|0
RUT|Rutland - Southern Vermont Regional Airport|Rutland|US|43.53|-72.95|0
RVK|Rørvik Airport, Ryum|Rørvik|NO|64.84|11.15|0
RVY|Pres. Gral. Óscar D. Gestido Binational Airport|Rivera/Santana do Livramento|UY|-30.97|-55.48|0
RWN|Rivne International Airport|Rivne|UA|50.61|26.14|0
RXS|Roxas Airport|Roxas City|PH|11.6|122.75|0
RYK|Shaikh Zaid Airport|Rahim Yar Khan|PK|28.38|70.28|0
RZR|Ramsar Airport|Ramsar|IR|36.91|50.69|0
SAB|Juancho E. Yrausquin Airport|Zion's Hill|BQ|17.65|-63.22|0
SAF|Santa Fe Municipal Airport|Santa Fe|US|35.62|-106.09|0
SAQ|San Andros Airport|Andros Island|BS|25.05|-78.05|0
SBA|Santa Barbara Municipal Airport|Santa Barbara|US|34.43|-119.84|0
SBH|St. Jean Airport|Gustavia|BL|17.9|-62.84|0
SBN|South Bend International Airport|South Bend|US|41.71|-86.32|0
SBP|San Luis County Regional Airport|San Luis Obispo|US|35.24|-120.64|0
SBT|Sabetta International Airport|Sabetta|RU|71.22|72.05|0
SBW|Sibu Airport|Sibu|MY|2.26|111.99|0
SBY|Salisbury Ocean City Wicomico Regional Airport|Salisbury|US|38.34|-75.51|0
SCC|Deadhorse Airport|Deadhorse|US|70.19|-148.46|0
SCE|State College Regional Airport|State College|US|40.85|-77.85|0
SCK|Stockton Metropolitan Airport|Stockton|US|37.89|-121.24|0
SCN|Saarbrücken Airport|Saarbrücken|DE|49.21|7.11|0
SCT|Socotra Airport|Mori|YE|12.63|53.91|0
SCW|Syktyvkar Airport|Syktyvkar|RU|61.65|50.85|0
SDD|Lubango Mukanka International Airport|Lubango|AO|-14.92|13.58|0
SDE|Vicecomodoro Angel D. La Paz Aragonés Airport|Santiago del Estero|AR|-27.77|-64.31|0
SDG|Sanandaj Airport|Sanandaj Airport|IR|35.25|47.01|0
SDK|Sandakan Airport|Sandakan|MY|5.9|118.06|0
SDL|Sundsvall-Härnösand Airport|Sundsvall/ Härnösand|SE|62.53|17.44|0
SDP|Sand Point Airport|Sand Point|US|55.31|-160.52|0
SDR|Seve Ballesteros-Santander Airport|Santander|ES|43.43|-3.82|0
SDS|Sado Airport|Sado|JP|38.06|138.41|0
SDW|Sindhudurg Airport|Chipi|IN|16.0|73.53|0
SDY|Sidney - Richland Regional Airport|Sidney|US|47.71|-104.19|0
SEB|Sabha Airport|Sabha|LY|26.99|14.47|0
SEK|Srednekolymsk Airport|Srednekolymsk|RU|67.48|153.74|0
SEN|London Southend Airport|Southend-on-Sea, Essex|GB|51.57|0.69|0
SFA|Sfax Thyna International Airport|Sfax|TN|34.72|10.69|0
SFG|Grand Case-l'Espérance Airport|Grand Case|MF|18.1|-63.05|0
SFJ|Kangerlussuaq International Airport|Kangerlussuaq|GL|67.01|-50.72|0
SFN|Sauce Viejo Airport|Santa Fe|AR|-31.71|-60.81|0
SFT|Skellefteå Airport|Skellefteå|SE|64.62|21.08|0
SGD|Sønderborg Airport|Sønderborg|DK|54.96|9.79|0
SGF|Springfield Branson National Airport|Springfield|US|37.25|-93.39|0
SGU|St George Regional Airport|St George|US|37.04|-113.51|0
SHB|Nakashibetsu Airport|Nakashibetsu|JP|43.58|144.96|0
SHD|Shenandoah Valley Regional Airport|Weyers Cave|US|38.26|-78.9|0
SHI|Shimojishima Airport|Miyakojima|JP|24.83|125.14|0
SHL|Shillong Airport|Shillong|IN|25.7|91.98|0
SHM|Nanki Shirahama Airport|Shirahama|JP|33.66|135.36|0
SHR|Sheridan County Airport|Sheridan|US|44.77|-106.98|0
SHS|Jingzhou Shashi Airport|Jingzhou (Shashi)|CN|30.29|112.45|0
SHV|Shreveport Regional Airport|Shreveport|US|32.44|-93.83|0
SHW|Sharurah Domestic Airport|Sharurah|SA|17.47|47.12|0
SIG|Fernando Luis Ribas Dominicci Airport|San Juan|PR|18.46|-66.1|0
SIS|Sishen Airport|Sishen|ZA|-27.65|23.0|0
SIT|Sitka Rocky Gutierrez Airport|Sitka|US|57.05|-135.36|0
SJE|Jorge E. Gonzalez Torres Airport|San José Del Guaviare|CO|2.58|-72.64|0
SJI|San Jose Airport|San Jose|PH|12.36|121.05|0
SJK|Professor Urbano Ernesto Stumpf Airport|São José Dos Campos|BR|-23.23|-45.86|0
SJL|São Gabriel da Cachoeira Airport|São Gabriel da Cachoeira|BR|-0.15|-66.99|0
SJP|Prof. Eribelto Manoel Reino State Airport|São José do Rio Preto|BR|-20.82|-49.41|0
SJT|San Angelo Regional Mathis Field|San Angelo|US|31.36|-100.5|0
SJZ|São Jorge Airport|Velas|PT|38.67|-28.18|0
SKN|Stokmarknes Airport, Skagen|Hadsel|NO|68.58|15.03|0
SKZ|Begum Nusrat Bhutto International Airport Sukkur|Sukkur|PK|27.72|68.79|0
SLD|Sliač Airport|Sliač|SK|48.64|19.13|0
SLE|Salem-Willamette Valley Airport/McNary Field|Salem|US|44.91|-123.0|0
SLK|Adirondack Regional Airport|Saranac Lake|US|44.39|-74.2|0
SLM|Salamanca Airport|Salamanca|ES|40.95|-5.5|0
SLN|Salina Municipal Airport|Salina|US|38.79|-97.65|0
SLP|Ponciano Arriaga International Airport|San Luis Potosí|MX|22.26|-100.94|0
SLU|George F. L. Charles Airport|Castries|LC|14.02|-60.99|0
SLW|Plan de Guadalupe International Airport|Saltillo|MX|25.54|-100.93|0
SLY|Salekhard Airport|Salekhard|RU|66.59|66.61|0
SMA|Santa Maria Airport|Vila do Porto|PT|36.97|-25.17|0
SMI|Samos Airport|Samos Island|GR|37.69|26.91|0
SML|Stella Maris Airport|Stella Maris|BS|23.58|-75.27|0
SMN|Lemhi County Airport|Salmon|US|45.12|-113.88|0
SMR|Simón Bolívar International Airport|Santa Marta|CO|11.12|-74.23|0
SMS|Sainte Marie Airport|Vohilava|MG|-17.09|49.82|0
SMW|Smara Airport|Smara|EH|26.73|-11.68|0
SMX|Santa Maria Public Airport Captain G Allan Hancock Field|Santa Maria|US|34.9|-120.46|0
SNB|Snake Bay Airport|Milikapiti|AU|-11.42|130.65|0
SNE|Preguiça Airport|Preguiça|CV|16.59|-24.28|0
SNO|Sakon Nakhon Airport|Sakon Nakhon Airport|TH|17.2|104.12|0
SNP|St Paul Island Airport|St Paul Island|US|57.17|-170.22|0
SNR|Saint-Nazaire-Montoir Airport|Saint-Nazaire/Montoir|FR|47.31|-2.15|0
SNV|Santa Elena de Uairén Airport|Santa Elena de Uairén|VE|4.55|-61.15|0
SNW|Thandwe Airport|Thandwe|MM|18.46|94.3|0
SOB|Hévíz–Balaton Airport|Sármellék|HU|46.69|17.16|0
SOJ|Sørkjosen Airport|Sørkjosen|NO|69.79|20.96|0
SOM|San Tomé Airport|El Tigre|VE|8.95|-64.15|0
SON|Santo Pekoa International Airport|Luganville|VU|-15.51|167.22|0
SOQ|Domine Eduard Osok Airport|Sorong|ID|-0.89|131.29|0
SOU|Southampton Airport|Southampton|GB|50.95|-1.36|0
SOW|Show Low Regional Airport|Show Low|US|34.26|-110.01|0
SPC|La Palma Airport|Sta Cruz de la Palma, La Palma Island|ES|28.63|-17.76|0
SPD|Saidpur Airport|Saidpur|BD|25.76|88.91|0
SPI|Abraham Lincoln Capital Airport|Springfield|US|39.84|-89.68|0
SPN|Saipan International Airport|I Fadang, Saipan|MP|15.12|145.73|0
SPP|Menongue Airport|Menongue|AO|-14.66|17.72|0
SPR|John Greif II Airport|San Pedro|BZ|17.91|-87.97|0
SPS|Wichita Falls Municipal Airport / Sheppard Air Force Base|Wichita Falls|US|33.99|-98.49|0
SPY|San Pedro Airport|San Pedro Airport|CI|4.75|-6.66|0
SQD|Shangrao Sanqingshan Airport|Shangrao (Hengfeng)|CN|28.38|117.96|0
SQG|Tebelian Airport|Sintang|ID|-0.05|111.46|0
SQJ|Sanming Shaxian Airport|Sanming (Sha)|CN|26.43|117.83|0
SQL|San Carlos Airport|San Carlos|US|37.51|-122.25|0
SRP|Stord Airport, Sørstokken|Leirvik|NO|59.79|5.34|0
SRT|Soroti Airport|Soroti|UG|1.73|33.62|0
SRY|Sari Dasht-e Naz International Airport|Sari|IR|36.64|53.19|0
SRZ|El Trompillo Airport|Santa Cruz|BO|-17.81|-63.17|0
SSJ|Sandnessjøen Airport, Stokka|Alstahaug|NO|65.96|12.47|0
SST|Santa Teresita Airport|Santa Teresita|AR|-36.54|-56.72|0
SSY|Mbanza Congo Airport|Mbanza Congo|AO|-6.27|14.25|0
STC|Saint Cloud Regional Airport|Saint Cloud|US|45.55|-94.06|0
STD|Mayor Buenaventura Vivas International Airport|Santo Domingo|VE|7.57|-72.04|0
STG|St George Airport|St George|US|56.58|-169.66|0
STM|Santarém - Maestro Wilson Fonseca International Airport|Santarém|BR|-2.42|-54.79|0
STS|Charles M. Schulz Sonoma County Airport|Santa Rosa|US|38.51|-122.81|0
STW|Stavropol Shpakovskoye Airport|Stavropol|RU|45.11|42.11|0
STX|Henry E. Rohlsen Airport|Christiansted|VI|17.7|-64.8|0
SUG|Surigao Airport|Surigao City|PH|9.76|125.48|0
SUI|Vladislav Ardzinba Sukhum International Airport|Sukhumi|GE|42.86|41.13|0
SUJ|Satu Mare International Airport|Satu Mare|RO|47.7|22.89|0
SUN|Friedman Memorial Airport|Hailey|US|43.5|-114.3|0
SUX|Sioux Gateway Airport / Brigadier General Bud Day Field|Sioux City|US|42.4|-96.38|0
SVA|Savoonga Airport|Savoonga|US|63.69|-170.49|0
SVB|Sambava Airport|Sambava|MG|-14.28|50.17|0
SVC|Grant County Airport|Silver City|US|32.64|-108.15|0
SVI|Eduardo Falla Solano Airport|San Vicente Del Caguán|CO|2.15|-74.77|0
SVJ|Svolvær Airport, Helle|Svolvær|NO|68.24|14.67|0
SVL|Savonlinna Airport|Savonlinna|FI|61.94|28.95|0
SVZ|Juan Vicente Gómez International Airport|San Antonio del Tachira|VE|7.84|-72.44|0
SWF|New York Stewart International Airport|Newburgh|US|41.5|-74.11|0
SWO|Stillwater Regional Airport|Stillwater|US|36.16|-97.09|0
SYO|Shonai Airport|Shonai|JP|38.81|139.79|0
SYQ|Tobías Bolaños International Airport|San Jose|CR|9.96|-84.14|0
SYS|Saskylakh Airport|Saskylakh|RU|71.93|114.08|0
SYY|Stornoway Airport|Stornoway, Western Isles|GB|58.22|-6.33|0
SZA|Soyo Airport|Soyo|AO|-6.14|12.37|0
SZF|Samsun-Çarşamba Airport|Samsun|TR|41.25|36.57|0
SZH|Shuozhou Zirun Airport|Shuozhou|CN|39.27|112.69|0
SZK|Skukuza Airport|Skukuza|ZA|-24.96|31.59|0
SZY|Olsztyn-Mazury Airport|Szymany|PL|53.48|20.94|0
TAC|Daniel Z. Romualdez Airport|Tacloban City|PH|11.23|125.03|0
TAH|Whitegrass Airport|Tanna Island|VU|-19.46|169.22|0
TAI|Taiz International Airport|Taiz|YE|13.69|44.14|0
TAM|General Francisco Javier Mina International Airport|Ciudad Madero|MX|22.29|-97.87|0
TAP|Tapachula International Airport|Tapachula|MX|14.79|-92.37|0
TAT|Poprad-Tatry Airport|Poprad|SK|49.07|20.24|0
TAY|Tartu Airport|Tartu|EE|58.31|26.69|0
TBB|Dong Tac Airport|Tuy Hoa|VN|13.05|109.33|0
TBH|Tugdan Airport|Tablas Island|PH|12.31|122.08|0
TBI|New Bight Airport|Cat Island|BS|24.32|-75.45|0
TBJ|Tabarka-Aïn Draham International Airport|Tabarka|TN|36.98|8.88|0
TBN|Waynesville-St. Robert Regional Airport-Forney Field|Fort Leonard Wood|US|37.74|-92.14|0
TBP|Captain Pedro Canga Rodríguez International Airport|Tumbes|PE|-3.55|-80.38|0
TBT|Tabatinga International Airport|Tabatinga|BR|-4.26|-69.94|0
TCA|Tennant Creek Airport|Tennant Creek|AU|-19.63|134.18|0
TCB|Treasure Cay Airport|Treasure Cay|BS|26.75|-77.39|0
TCO|La Florida Airport|Tumaco|CO|1.81|-78.75|0
TCP|Taba International Airport|Taba|EG|29.59|34.78|0
TCQ|Coronel FAP Carlos Ciriani Santa Rosa International Airport|Tacna|PE|-18.05|-70.28|0
TCZ|Tengchong Tuofeng Airport|Baoshan (Tengchong)|CN|24.94|98.49|0
TDD|Teniente Av. Jorge Henrich Arauz Airport|Trinidad|BO|-14.82|-64.92|0
TDK|Taldykorgan Airport|Taldykorgan|KZ|45.12|78.44|0
TDX|Trat Airport|Laem Ngop|TH|12.27|102.32|0
TEE|Cheikh Larbi Tébessi Airport|Tébessi|DZ|35.43|8.12|0
TEN|Tongren Fenghuang Airport|Tongren (Daxing)|CN|27.88|109.31|0
TEQ|Tekirdağ Çorlu Airport|Çorlu|TR|41.14|27.92|0
TER|Lajes Airport|Praia da Vitória|PT|38.76|-27.09|0
TEX|Telluride Regional Airport|Telluride|US|37.95|-107.91|0
TEZ|Tezpur Airport|Tezpur Airport|IN|26.71|92.78|0
TFF|Tefé Airport|Tefé|BR|-3.38|-64.72|0
TGG|Sultan Mahmud Airport|Kuala Terengganu|MY|5.38|103.1|0
TGJ|Tiga Airport|Tiga|NC|-21.1|167.8|0
TGK|Taganrog Yuzhny Airport|Taganrog|RU|47.2|38.85|0
TGM|Târgu Mureş Transilvania International Airport|Recea|RO|46.47|24.41|0
TGO|Tongliao Airport|Tongliao|CN|43.56|122.2|0
TGR|Touggourt Sidi Madhi Airport|Touggourt|DZ|33.07|6.09|0
TGT|Tanga Airport|Tanga|TZ|-5.09|39.07|0
TGU|Toncontín Airport|Tegucigalpa|HN|14.06|-87.22|0
TGZ|Angel Albino Corzo International Airport|Tuxtla Gutiérrez|MX|16.56|-93.03|0
THE|Senador Petrônio Portela Airport|Teresina|BR|-5.06|-42.82|0
THG|Thangool Airport|Biloela|AU|-24.49|150.58|0
THL|Tachileik Airport|Tachileik|MM|20.48|99.94|0
THN|Trollhättan-Vänersborg Airport|Trollhättan|SE|58.32|12.35|0
THQ|Tianshui Maijishan Airport|Tianshui (Maiji)|CN|34.56|105.86|0
THS|Sukhothai Airport|Sukhothai Airport|TH|17.24|99.82|0
THU|Pituffik Space Base|Pituffik|GL|76.53|-68.7|0
TIH|Tikehau Airport|Tuherahera|PF|-15.12|-148.23|0
TIM|Mozes Kilangin Airport|Timika|ID|-4.53|136.89|0
TIN|Tindouf Airport|Tindouf|DZ|27.7|-8.17|0
TIQ|Francisco Manglona Borja / Tinian International Airport|Tinian Island|MP|15.0|145.62|0
TIU|Timaru Airport|Timaru Airport|NZ|-44.3|171.23|0
TIV|Tivat Airport|Tivat|ME|42.4|18.72|0
TIW|Tacoma Narrows Airport|Tacoma|US|47.27|-122.58|0
TJA|Capitan Oriel Lea Plaza Airport|Tarija|BO|-21.56|-64.7|0
TJG|Warukin Airport|Tanta-Tabalong|ID|-2.22|115.44|0
TJH|Konotori Tajima Airport|Toyooka|JP|35.51|134.79|0
TJK|Tokat Airport|Tokat|TR|40.32|36.39|0
TKD|Takoradi Airport|Sekondi-Takoradi|GH|4.9|-1.77|0
TKF|Truckee Tahoe Airport|Truckee|US|39.32|-120.14|0
TKG|Radin Inten II International Airport|Bandar Lampung|ID|-5.25|105.18|0
TKN|Tokunoshima Airport|Amagi|JP|27.84|128.88|0
TKP|Takapoto Airport|Takapoto Airport|PF|-14.71|-145.25|0
TKX|Takaroa Airport|Takaroa Airport|PF|-14.46|-145.02|0
TLE|Toliara Airport|Toliara|MG|-23.38|43.73|0
TLH|Tallahassee International Airport|Tallahassee|US|30.4|-84.35|0
TLN|Toulon-Hyères Airport|Hyères, Var|FR|43.1|6.15|0
TLQ|Turpan Jiaohe Airport|Turpan|CN|43.03|89.1|0
TME|Gustavo Vargas Airport|Tame|CO|6.45|-71.76|0
TMH|Tanah Merah Airport|Tanah Merah|ID|-6.1|140.3|0
TMJ|Termez Airport|Termez|UZ|37.29|67.31|0
TMT|Trombetas Airport|Oriximiná|BR|-1.49|-56.4|0
TMW|Tamworth Airport|Tamworth|AU|-31.08|150.85|0
TMX|Timimoun Airport|Timimoun|DZ|29.24|0.28|0
TND|Alberto Delgado Airport|Trinidad|CU|21.79|-80.0|0
TNE|New Tanegashima Airport|Tanegashima|JP|30.61|130.99|0
TNH|Tonghua Sanyuanpu Airport|Tonghua|CN|42.05|125.73|0
TNJ|Raja Haji Fisabilillah International Airport|Tanjung Pinang-Bintan Island|ID|0.92|104.53|0
TOD|Tioman Airport|Tioman Island|MY|2.82|104.16|0
TOE|Tozeur Nefta International Airport|Tozeur|TN|33.94|8.11|0
TOL|Eugene F. Kranz Toledo Express Airport|Toledo|US|41.59|-83.81|0
TOU|Touho Airport|Touho|NC|-20.79|165.26|0
TOY|Toyama Kitokito Airport|Toyama|JP|36.65|137.19|0
TPJ|Taplejung Airport|Taplejung|NP|27.35|87.7|0
TPP|Cadete FAP Guillermo Del Castillo Paredes Airport|Tarapoto|PE|-6.51|-76.37|0
TPQ|Amado Nervo National Airport|Tepic|MX|21.42|-104.84|0
TPS|Vincenzo Florio Airport Trapani-Birgi|Trapani (TP)|IT|37.91|12.49|0
TRA|Tarama Airport|Tarama|JP|24.65|124.68|0
TRC|Francisco Sarabia Tinoco International Airport|Torreón|MX|25.56|-103.4|0
TRE|Tiree Airport|Balemartine, Argyll and Bute|GB|56.5|-6.87|0
TRG|Tauranga Airport|Tauranga|NZ|-37.67|176.2|0
TRI|Tri-Cities Regional TN/VA Airport|Blountville|US|36.48|-82.41|0
TRK|Juwata International Airport / Suharnoko Harbani AFB|Tarakan|ID|3.33|117.56|0
TRR|China Bay Airport|Trincomalee|LK|8.54|81.18|0
TRT|Toraja Airport|Toraja|ID|-3.18|119.92|0
TSJ|Tsushima Airport|Tsushima|JP|34.28|129.33|0
TSM|Taos Regional Airport|Taos|US|36.45|-105.68|0
TST|Trang Airport|Trang|TH|7.51|99.62|0
TSV|Townsville Airport / RAAF Base Townsville|Townsville|AU|-19.25|146.77|0
TTA|Tan Tan Airport|Tan Tan|MA|28.45|-11.16|0
TTE|Sultan Babullah Airport|Ternate|ID|0.83|127.38|0
TTJ|Tottori Sand Dunes Conan Airport|Tottori|JP|35.53|134.17|0
TTN|Trenton Mercer Airport|Ewing Township|US|40.28|-74.81|0
TTT|Taitung Airport|Taitung City|TW|22.75|121.1|0
TUA|Lieutenant Colonel Luis A. Mantilla International Airport|Tulcán|EC|0.81|-77.71|0
TUB|Tubuai Airport|Tubuai Airport|PF|-23.37|-149.52|0
TUF|Tours Val de Loire Airport|Tours, Indre-et-Loire|FR|47.43|0.73|0
TUG|Tuguegarao Airport|Tuguegarao City|PH|17.64|121.73|0
TUI|Turaif Domestic Airport|Turaif|SA|31.69|38.73|0
TUO|Taupo Airport|Taupo|NZ|-38.74|176.08|0
TUP|Tupelo Regional Airport|Tupelo|US|34.27|-88.77|0
TUR|Tucuruí Airport|Tucuruí|BR|-3.79|-49.72|0
TVC|Cherry Capital Airport|Traverse City|US|44.74|-85.58|0
TVF|Thief River Falls Regional Airport|Thief River Falls|US|48.07|-96.18|0
TVT|Tashkent-Khumo International Airport|Tashkent|UZ|41.31|69.4|0
TVY|Dawei Airport|Dawei|MM|14.1|98.2|0
TWF|Joslin Field Magic Valley Regional Airport|Twin Falls|US|42.48|-114.49|0
TWT|Sanga Sanga Airport|Bongao|PH|5.05|119.74|0
TWU|Tawau Airport|Tawau|MY|4.31|118.12|0
TXE|Rembele Airport|Takengon|ID|4.72|96.85|0
TXK|Texarkana Regional Airport (Webb Field)|Texarkana|US|33.45|-93.99|0
TYF|Torsby Airport|Torsby|SE|60.16|12.99|0
TYL|Captain Victor Montes Arias International Airport|Talara|PE|-4.58|-81.25|0
TYR|Tyler Pounds Regional Airport|Tyler|US|32.35|-95.4|0
TZA|Sir Barry Bowen Municipal Airport|Belize City|BZ|17.52|-88.2|0
TZN|Congo Town Airport|Andros|BS|24.16|-77.59|0
TZX|Trabzon International Airport|Trabzon|TR|41.0|39.79|0
UAI|Commander in Chief of FALINTIL, Kay Rala Xanana Gusmão, International Airport|Suai|TL|-9.3|125.29|0
UAQ|Domingo Faustino Sarmiento Airport|San Juan|AR|-31.57|-68.42|0
UAR|Bouarfa Airport|Bouarfa|MA|32.51|-1.98|0
UBA|Mário de Almeida Franco Airport|Uberaba|BR|-19.77|-47.96|0
UBJ|Yamaguchi Ube Airport|Ube|JP|33.93|131.28|0
UBP|Ubon Ratchathani Airport|Ubon Ratchathani|TH|15.25|104.87|0
UCB|Ulanqab Jining Airport|Ulanqab|CN|41.13|113.11|0
UCT|Ukhta Airport|Ukhta|RU|63.57|53.8|0
UDI|Ten. Cel. Aviador César Bombonato Airport|Uberlândia|BR|-18.88|-48.23|0
UDR|Maharana Pratap Airport|Udaipur|IN|24.62|73.9|0
UEL|Quelimane Airport|Quelimane|MZ|-17.86|36.87|0
UEO|Kumejima Airport|Kumejima|JP|26.36|126.71|0
UGA|Bulgan Airport|Bulgan|MN|48.85|103.48|0
UGU|Bilorai Airport|Bilogai|ID|-3.74|137.03|0
UIB|El Caraño Airport|Quibdó|CO|5.69|-76.64|0
UIH|Phu Cat Airport|Quy Nohn|VN|13.96|109.04|0
UIN|Quincy Regional Airport Baldwin Field|Quincy|US|39.94|-91.19|0
UKE|Utkela Airport|Bhawanipatna|IN|20.1|83.18|0
UKX|Ust-Kut Airport|Ust-Kut|RU|56.86|105.73|0
ULG|Ölgii Mongolei International Airport|Ölgii|MN|48.99|89.92|0
ULK|Lensk Airport|Lensk|RU|60.72|114.83|0
ULO|Ulaangom Airport|Ulaangom|MN|50.07|91.94|0
ULP|Quilpie Airport|Quilpie Airport|AU|-26.61|144.25|0
ULU|Gulu Airport|Gulu|UG|2.81|32.27|0
ULV|Ulyanovsk Baratayevka Airport|Ulyanovsk|RU|54.27|48.23|0
ULY|Ulyanovsk Vostochny Airport|Cherdakly|RU|54.4|48.8|0
UNI|Union Island International Airport|Union Island|VC|12.6|-61.41|0
UNK|Unalakleet Airport|Unalakleet|US|63.89|-160.8|0
UNN|Ranong Airport|Ranong|TH|9.78|98.59|0
UPN|Uruapan - Licenciado y General Ignacio Lopez Rayon International Airport|Uruapan|MX|19.4|-102.04|0
URE|Kuressaare Airport|Kuressaare|EE|58.23|22.51|0
URG|Rubem Berta Airport|Uruguaiana|BR|-29.78|-57.04|0
URJ|Uray Airport|Uray|RU|60.1|64.83|0
URS|Kursk East Airport|Kursk|RU|51.75|36.3|0
URT|Surat Thani Airport|Surat Thani|TH|9.13|99.14|0
URY|Gurayat Domestic Airport|Gurayat|SA|31.41|37.28|0
USA|Concord-Padgett Regional Airport|Concord|US|35.39|-80.71|0
USH|Ushuaia - Malvinas Argentinas International Airport|Ushuaia|AR|-54.84|-68.3|0
USK|Usinsk Airport|Usinsk|RU|66.0|57.37|0
USN|Ulsan Airport|Ulsan|KR|35.59|129.35|0
USR|Ust-Nera Airport|Ust-Nera|RU|64.55|143.12|0
UST|Northeast Florida Regional Airport|St Augustine|US|29.96|-81.34|0
USU|Francisco B. Reyes (Busuanga) Airport|Coron|PH|12.12|120.1|0
UTN|Upington Airport|Upington|ZA|-28.4|21.26|0
UTO|Indian Mountain LRRS Airport|Utopia Creek|US|65.99|-153.7|0
UTT|K. D. Matanzima Airport|Mthatha|ZA|-31.55|28.67|0
UUA|Bugulma Airport|Bugulma|RU|54.64|52.8|0
UVE|Ouvéa Airport|Ouvéa|NC|-20.64|166.57|0
UYL|Nyala Airport|Nyala|SD|12.05|24.96|0
UYN|Yulin Yuyang Airport|Yulin|CN|38.36|109.59|0
VAI|Vanimo Airport|Vanimo|PG|-2.69|141.3|0
VAM|Villa International Airport Maamigili|Maamigili|MV|3.47|72.83|0
VAN|Van Ferit Melen Airport|Van|TR|38.47|43.33|0
VAQ|Vanavara Airport|Vanavara|RU|60.36|102.31|0
VAS|Sivas Nuri Demirağ Airport|Sivas|TR|39.81|36.9|0
VAW|Vardø Airport, Svartnes|Vardø|NO|70.36|31.04|0
VBS|Brescia Gabriele d'Annunzio Airport|Montichiari (BS)|IT|45.43|10.33|0
VCS|Con Dao Airport|Con Dao|VN|8.73|106.63|0
VCT|Victoria Regional Airport|Victoria|US|28.85|-96.92|0
VDC|Glauber de Andrade Rocha Airport|Vitória da Conquista|BR|-14.91|-40.91|0
VDE|El Hierro Airport|El Hierro Island|ES|27.81|-17.89|0
VDH|Dong Hoi Airport|Dong Hoi|VN|17.52|106.59|0
VDM|Gobernador Castello Airport|Viedma / Carmen de Patagones|AR|-40.87|-63.0|0
VDO|Van Don International Airport|Van Don|VN|21.12|107.42|0
VDS|Vadsø Airport|Vadsø|NO|70.07|29.84|0
VDZ|Valdez Pioneer Field|Valdez|US|61.13|-146.25|0
VEL|Vernal Regional Airport|Vernal|US|40.44|-109.51|0
VEO|Severo-Yeniseysk Airport|Severo-Yeniseysk|RU|60.37|93.01|0
VGO|Vigo Airport|Vigo|ES|42.23|-8.63|0
VHM|Vilhelmina South Lapland Airport|Vilhelmina|SE|64.58|16.83|0
VIG|Juan Pablo Pérez Alfonso Airport|El Vigía|VE|8.62|-71.67|0
VII|Vinh Airport|Vinh|VN|18.74|105.67|0
VIJ|Virgin Gorda Airport|Spanish Town|VG|18.45|-64.43|0
VIT|Vitoria Airport|Alava|ES|42.88|-2.72|0
VKG|Rach Gia Airport|Rach Gia|VN|9.96|105.13|0
VKT|Vorkuta Airport|Vorkuta|RU|67.49|63.99|0
VLD|Valdosta Regional Airport|Valdosta|US|30.78|-83.28|0
VLL|Valladolid Airport|Valladolid|ES|41.71|-4.85|0
VLV|Dr. Antonio Nicolás Briceño Airport|Valera|VE|9.34|-70.58|0
VMU|Baimuru Airport|Baimuru|PG|-7.5|144.82|0
VNX|Vilankulo Airport|Vilanculo|MZ|-22.02|35.31|0
VOL|Nea Anchialos National Airport|Nea Anchialos|GR|39.22|22.79|0
VOZ|Voronezh International Airport|Voronezh|RU|51.81|39.23|0
VPE|Ngjiva Pereira Airport|Ngiva|AO|-17.04|15.68|0
VPN|Vopnafjörður Airport|Vopnafjörður|IS|65.72|-14.85|0
VPS|Destin-Fort Walton Beach Airport|Valparaiso|US|30.48|-86.52|0
VPY|Chimoio Airport|Chimoio|MZ|-19.15|33.43|0
VQS|Antonio Rivera Rodriguez Airport|Vieques|PR|18.13|-65.49|0
VRB|Vero Beach Regional Airport|Vero Beach|US|27.66|-80.42|0
VRC|Virac Airport|Virac|PH|13.58|124.21|0
VRL|Vila Real Airport|Vila Real|PT|41.27|-7.72|0
VSE|Aerodromo Goncalves Lobato (Viseu Airport)|Viseu|PT|40.73|-7.89|0
VTU|Hermanos Ameijeiras Airport|Las Tunas|CU|20.99|-76.94|0
VUP|Alfonso López Pumarejo Airport|Valledupar|CO|10.44|-73.25|0
VUS|Velikiy Ustyug Airport|Velikiy Ustyug|RU|60.79|46.26|0
VVC|Vanguardia Airport|Villavicencio|CO|4.17|-73.61|0
VVZ|Illizi Takhamalt Airport|Illizi|DZ|26.72|8.62|0
VXC|Lichinga Airport|Lichinga|MZ|-13.27|35.27|0
VXO|Växjö Kronoberg Airport|Växjö|SE|56.93|14.73|0
VYI|Vilyuisk Airport|Vilyuisk|RU|63.76|121.69|0
WAE|Wadi Al Dawasir Domestic Airport|Wadi Al Dawasir|SA|20.5|45.2|0
WAG|Wanganui Airport|Wanganui|NZ|-39.96|175.02|0
WBM|Wapenamanda Airport|Wapenamanda|PG|-5.64|143.89|0
WDS|Shiyan Wudangshan Airport|Shiyan (Maojian)|CN|32.59|110.91|0
WEF|Weifang Nanyuan Airport|Weifang (Kuiwen)|CN|36.65|119.12|0
WEH|Weihai Dashuibo Airport|Weihai|CN|37.19|122.23|0
WEI|Weipa Airport|Weipa|AU|-12.68|141.92|0
WGA|Wagga Wagga Airport|Forest Hill|AU|-35.16|147.47|0
WGE|Walgett Airport|Walgett Airport|AU|-30.03|148.13|0
WGN|Shaoyang Wugang Airport|Shaoyang (Wugang)|CN|26.81|110.64|0
WHA|Wuhu Xuanzhou Airport|Wuhu|CN|31.1|118.67|0
WHK|Whakatāne Airport|Whakatāne|NZ|-37.92|176.92|0
WIC|Wick John O'Groats Airport|Wick|GB|58.46|-3.09|0
WIL|Nairobi Wilson Airport|Nairobi|KE|-1.32|36.81|0
WIN|Winton Airport|Winton Airport|AU|-22.36|143.09|0
WJR|Wajir Airport|Wajir|KE|1.73|40.09|0
WJU|Wonju Airport / Hoengseong Air Base (K-38/K-46)|Wonju|KR|37.44|127.96|0
WKA|Wanaka Airport|Wanaka|NZ|-44.72|169.25|0
WKJ|Wakkanai Airport|Wakkanai|JP|45.4|141.8|0
WKK|Aleknagik / New Airport|Aleknagik|US|59.28|-158.62|0
WMN|Maroantsetra Airport|Maroantsetra|MG|-15.44|49.69|0
WMT|Zunyi Maotai Airport|Zunyi|CN|27.96|106.44|0
WMX|Wamena Airport|Wamena|ID|-4.1|138.95|0
WNI|Matahora Airport|Wangi-wangi Island|ID|-5.29|123.64|0
WNP|Naga Airport|Naga|PH|13.58|123.27|0
WNR|Windorah Airport|Windorah|AU|-25.41|142.67|0
WNS|Shaheed Benazirabad Airport|Nawabashah|PK|26.22|68.39|0
WOS|Wonsan Kalma Airport|Wonsan|KP|39.17|127.49|0
WRE|Whangarei Airport|Whangarei|NZ|-35.77|174.36|0
WRG|Wrangell Airport|Wrangell|US|56.48|-132.37|0
WST|Westerly State Airport|Westerly|US|41.35|-71.8|0
WSZ|Westport Airport|Westport|NZ|-41.74|171.58|0
WUA|Wuhai Airport|Wuhai|CN|39.79|106.8|0
WUN|Wiluna Airport|Wiluna Airport|AU|-26.63|120.22|0
WUS|Nanping Wuyishan Airport|Wuyishan|CN|27.7|118.0|0
WUU|Wau Airport|Wau|SS|7.73|27.98|0
WUZ|Wuzhou Xijiang Airport|Tangbu|CN|23.4|111.09|0
WWK|Wewak International Airport|Wewak|PG|-3.58|143.67|0
WYA|Whyalla Airport|Whyalla|AU|-33.06|137.51|0
WYS|Yellowstone Airport|West Yellowstone|US|44.69|-111.12|0
XAI|Xinyang Minggang Airport|Xinyang|CN|32.54|114.08|0
XAP|Serafin Enoss Bertaso Airport|Chapecó|BR|-27.13|-52.66|0
XCH|Christmas Island International Airport|Flying Fish Cove|CX|-10.45|105.69|0
XCR|Chalons Vatry airport|Chalons en Champagne|FR|48.77|4.21|0
XFN|Xiangyang Liuji Airport|Xiangyang (Xiangzhou)|CN|32.15|112.29|0
XIC|Xichang Qingshan Airport|Liangshan (Xichang)|CN|27.99|102.18|0
XIL|Xilinhot Airport|Xilinhot|CN|43.92|115.96|0
XKS|Kasabonika Airport|Kasabonika|CA|53.52|-88.64|0
XMH|Manihi Airport|Manihi Airport|PF|-14.44|-146.07|0
XMS|Coronel E Carvajal Airport|Macas|EC|-2.3|-78.12|0
XNA|Northwest Arkansas National Airport|Fayetteville/Springdale/Rogers|US|36.28|-94.31|0
XQP|Quepos Managua Airport|Quepos|CR|9.44|-84.13|0
XQU|Qualicum Beach Airport|Qualicum Beach|CA|49.34|-124.39|0
XRY|Jerez Airport|Jerez de la Frontera|ES|36.74|-6.06|0
XSC|South Caicos Airport|South Caicos|TC|21.52|-71.53|0
XSP|Seletar Airport|Seletar|SG|1.42|103.87|0
XTG|Thargomindah Airport|Thargomindah|AU|-27.99|143.81|0
XUZ|Xuzhou Guanyin International Airport|Xuzhou|CN|34.06|117.56|0
XWA|Williston Basin International Airport|Williston|US|48.26|-103.75|0
YAA|Anahim Lake Airport|Anahim Lake|CA|52.45|-125.3|0
YAG|Fort Frances Municipal Airport|Fort Frances|CA|48.66|-93.44|0
YAK|Yakutat Airport|Yakutat|US|59.51|-139.66|0
YAM|Sault Ste Marie Airport|Sault Ste Marie|CA|46.48|-84.51|0
YAY|St. Anthony Airport|St. Anthony|CA|51.39|-56.08|0
YAZ|Tofino / Long Beach Airport|Tofino|CA|49.08|-125.78|0
YBC|Baie-Comeau Airport|Baie-Comeau|CA|49.13|-68.2|0
YBG|Saguenay-Bagotville Airport|Saguenay|CA|48.33|-70.99|0
YBK|Baker Lake Airport|Baker Lake|CA|64.3|-96.08|0
YBL|Campbell River Airport|Campbell River|CA|49.95|-125.27|0
YBP|Yibin Wuliangye Airport|Yibin (Cuiping)|CN|28.86|104.53|0
YBR|Brandon Municipal Airport|Brandon|CA|49.91|-99.95|0
YBX|Lourdes-de-Blanc-Sablon Airport|Blanc-Sablon|CA|51.44|-57.19|0
YBY|Bonnyville Airport|Bonnyville|CA|54.3|-110.74|0
YCB|Cambridge Bay Airport|Cambridge Bay|CA|69.11|-105.14|0
YCD|Nanaimo Airport|Nanaimo|CA|49.05|-123.87|0
YCG|Castlegar/West Kootenay Regional Airport|Castlegar|CA|49.3|-117.63|0
YCL|Charlo Airport|Charlo|CA|47.99|-66.33|0
YCM|Niagara District Airport|Niagara-on-the-Lake|CA|43.19|-79.17|0
YDA|Dawson City Airport|Dawson City|CA|64.04|-139.13|0
YDF|Deer Lake Airport|Deer Lake|CA|49.21|-57.4|0
YDN|Dauphin Barker Airport|Dauphin|CA|51.1|-100.05|0
YEI|Bursa Yenişehir Airport|Yenişehir|TR|40.26|29.56|0
YEV|Inuvik Mike Zubko Airport|Inuvik|CA|68.3|-133.48|0
YFB|Iqaluit Airport|Iqaluit|CA|63.76|-68.56|0
YFC|Fredericton International Airport|Fredericton|CA|45.87|-66.53|0
YFS|Fort Simpson Airport|Fort Simpson|CA|61.76|-121.24|0
YGJ|Yonago Kitaro Airport / JASDF Miho Air Base|Yonago|JP|35.49|133.24|0
YGL|La Grande Rivière Airport|La Grande Rivière|CA|53.63|-77.7|0
YGP|Michel-Pouliot Gaspé Airport|Gaspé|CA|48.77|-64.48|0
YGR|Îles-de-la-Madeleine Airport|Les Îles-de-la-Madeleine|CA|47.43|-61.78|0
YGV|Havre-Saint-Pierre Airport|Havre-Saint-Pierre|CA|50.28|-63.61|0
YGW|Kuujjuarapik Airport|Kuujjuarapik|CA|55.28|-77.77|0
YHM|John C. Munro Hamilton International Airport|Hamilton|CA|43.17|-79.93|0
YHU|Montréal / Saint-Hubert Metropolitan Airport|Montréal|CA|45.52|-73.42|0
YHY|Hay River / Merlyn Carter Airport|Hay River|CA|60.84|-115.78|0
YIC|Yichun Mingyueshan Airport|Yichun|CN|27.8|114.31|0
YIE|Arxan Yi'ershi Airport|Arxan|CN|47.31|119.91|0
YIF|St Augustin Airport|St-Augustin|CA|51.21|-58.66|0
YIH|Yichang Sanxia Airport|Yichang (Xiaoting)|CN|30.55|111.48|0
YIN|Ili Yining International Airport|Ili (Yining / Ghulja)|CN|43.96|81.33|0
YIV|Island Lake Airport|Island Lake|CA|53.86|-94.65|0
YJT|Stephenville Dymond International Airport|Stephenville|CA|48.54|-58.55|0
YKA|Kamloops John Moose Fulton Field Regional Airport|Kamloops|CA|50.7|-120.45|0
YKF|Region of Waterloo International Airport|Breslau|CA|43.46|-80.38|0
YKH|Yingkou Lanqi Airport|Yingkou (Laobian)|CN|40.54|122.36|0
YKL|Schefferville Airport|Schefferville|CA|54.81|-66.81|0
YKM|Yakima Air Terminal McAllister Field|Yakima|US|46.57|-120.54|0
YKO|Hakkari Yüksekova Airport|Hakkari|TR|37.55|44.24|0
YLK|Barrie-Lake Simcoe Regional Airport|Barrie|CA|44.49|-79.55|0
YLL|Lloydminster Airport|Lloydminster|CA|53.31|-110.07|0
YLX|Yulin Fumian Airport|Yulin|CN|22.43|110.12|0
YMM|Fort McMurray International Airport|Fort McMurray|CA|56.65|-111.22|0
YMO|Moosonee Airport|Moosonee|CA|51.29|-80.61|0
YMS|Moises Benzaquen Rengifo Airport|Yurimaguas|PE|-5.89|-76.12|0
YMT|Chapais Airport|Chibougamau|CA|49.77|-74.53|0
YMX|Montreal Mirabel International Airport|Montréal|CA|45.68|-74.04|0
YNA|Natashquan Airport|Natashquan|CA|50.19|-61.79|0
YND|Ottawa / Gatineau Airport|Gatineau|CA|45.52|-75.56|0
YNJ|Yanji Chaoyangchuan Airport|Yanji|CN|42.88|129.45|0
YNL|Points North Landing Airport|Points North Landing|CA|58.28|-104.08|0
YOJ|High Level Airport|High Level|CA|58.62|-117.17|0
YOL|Yola Airport|Yola|NG|9.26|12.43|0
YPA|Prince Albert Glass Field|Prince Albert|CA|53.21|-105.67|0
YPE|Peace River Airport|Peace River|CA|56.23|-117.45|0
YPL|Pickle Lake Airport|Pickle Lake|CA|51.45|-90.21|0
YPN|Port-Menier Airport|Port-Menier|CA|49.84|-64.29|0
YPQ|Peterborough Regional Airport|Peterborough|CA|44.23|-78.36|0
YPR|Prince Rupert Airport|Prince Rupert|CA|54.29|-130.45|0
YPW|Powell River Airport|Powell River|CA|49.83|-124.5|0
YPX|Puvirnituq Airport|Puvirnituq|CA|60.05|-77.29|0
YPY|Fort Chipewyan Airport|Fort Chipewyan|CA|58.77|-111.12|0
YPZ|Burns Lake Airport|Burns Lake|CA|54.38|-125.95|0
YQA|Muskoka Airport|Gravenhurst|CA|44.98|-79.31|0
YQD|The Pas Airport|The Pas|CA|53.97|-101.09|0
YQG|Windsor International Airport|Windsor|CA|42.28|-82.96|0
YQH|Watson Lake Airport|Watson Lake|CA|60.12|-128.82|0
YQK|Kenora Airport|Kenora|CA|49.79|-94.36|0
YQL|Lethbridge County Airport|Lethbridge|CA|49.63|-112.8|0
YQM|Greater Moncton Roméo LeBlanc International Airport|Moncton|CA|46.11|-64.68|0
YQN|Nakina Airport|Nakina|CA|50.18|-86.7|0
YQQ|Comox Valley International Airport / CFB Comox|Comox|CA|49.71|-124.89|0
YQR|Regina International Airport|Regina|CA|50.43|-104.66|0
YQT|Thunder Bay International Airport|Thunder Bay|CA|48.37|-89.32|0
YQU|Grande Prairie Airport|Grande Prairie|CA|55.18|-118.89|0
YQX|Gander International Airport|Gander|CA|48.94|-54.57|0
YQY|Sydney / J.A. Douglas McCurdy Airport|Sydney|CA|46.16|-60.05|0
YQZ|Quesnel Airport|Quesnel|CA|53.03|-122.51|0
YRB|Resolute Bay Airport|Resolute Bay|CA|74.72|-94.97|0
YRJ|Roberval Airport|Roberval|CA|48.52|-72.27|0
YRL|Red Lake Airport|Red Lake|CA|51.07|-93.79|0
YRO|Ottawa / Rockcliffe Airport|Ottawa|CA|45.46|-75.64|0
YRT|Rankin Inlet Airport|Rankin Inlet|CA|62.81|-92.12|0
YSB|Sudbury Airport|Sudbury|CA|46.62|-80.8|0
YSF|Stony Rapids Airport|Stony Rapids|CA|59.25|-105.84|0
YSJ|Saint John Airport|Saint John|CA|45.32|-65.89|0
YSL|Saint-Léonard Airport|Saint-Léonard|CA|47.16|-67.84|0
YSM|Fort Smith Airport|Fort Smith|CA|60.02|-111.96|0
YSQ|Songyuan Chaganhu Airport|Qian Gorlos Mongol Autonomous County|CN|44.93|124.55|0
YTH|Thompson Airport|Thompson|CA|55.8|-97.86|0
YTS|Timmins/Victor M. Power|Timmins|CA|48.57|-81.38|0
YTY|Yangzhou Taizhou Airport|Yangzhou|CN|32.56|119.72|0
YTZ|Billy Bishop Toronto City Airport|Toronto|CA|43.63|-79.4|0
YUM|Yuma International Airport / Marine Corps Air Station Yuma|Yuma|US|32.65|-114.61|0
YUS|Yushu Batang Airport|Yushu (Batang)|CN|32.84|97.04|0
YUX|Hall Beach Airport|Sanirajak|CA|68.78|-81.24|0
YUY|Rouyn Noranda Airport|Rouyn-Noranda|CA|48.21|-78.84|0
YVB|Bonaventure Airport|Bonaventure|CA|48.07|-65.46|0
YVC|La Ronge Airport|La Ronge|CA|55.15|-105.26|0
YVO|Val-d'Or Airport|Val-d'Or|CA|48.05|-77.78|0
YVP|Kuujjuaq Airport|Kuujjuaq|CA|58.1|-68.43|0
YVQ|Norman Wells Airport|Norman Wells|CA|65.28|-126.8|0
YVV|Wiarton Airport|Wiarton|CA|44.75|-81.11|0
YWK|Wabush Airport|Wabush|CA|52.92|-66.86|0
YWL|Williams Lake Airport|Williams Lake|CA|52.18|-122.05|0
YXC|Cranbrook/Canadian Rockies International Airport|Cranbrook|CA|49.61|-115.78|0
YXH|Medicine Hat Regional Airport|Medicine Hat|CA|50.02|-110.72|0
YXJ|Fort St John / North Peace Regional Airport|Fort Saint John|CA|56.24|-120.74|0
YXK|Rimouski Airport|Rimouski|CA|48.48|-68.5|0
YXL|Sioux Lookout Airport|Sioux Lookout|CA|50.11|-91.91|0
YXS|Prince George (International) Airport|Prince George|CA|53.88|-122.67|0
YXT|Northwest Regional Airport Terrace-Kitimat|Terrace|CA|54.47|-128.58|0
YXU|London International Airport|London|CA|43.03|-81.15|0
YXX|Abbotsford International Airport|Abbotsford|CA|49.03|-122.36|0
YXY|Whitehorse / Erik Nielsen International Airport|Whitehorse|CA|60.71|-135.07|0
YYA|Yueyang Sanhe Airport|Yueyang (Yueyanglou)|CN|29.31|113.28|0
YYB|North Bay Jack Garland Airport|North Bay|CA|46.36|-79.42|0
YYD|Smithers Airport|Smithers|CA|54.82|-127.18|0
YYE|Fort Nelson Airport|Fort Nelson|CA|58.84|-122.6|0
YYF|Penticton Airport|Penticton|CA|49.46|-119.6|0
YYG|Charlottetown Airport|Charlottetown|CA|46.29|-63.13|0
YYL|Lynn Lake Airport|Lynn Lake|CA|56.86|-101.08|0
YYQ|Churchill Airport|Churchill|CA|58.74|-94.07|0
YYR|Goose Bay Airport|Goose Bay|CA|53.32|-60.43|0
YYY|Mont Joli Airport|Mont-Joli|CA|48.61|-68.21|0
YZF|Yellowknife International Airport|Yellowknife|CA|62.46|-114.44|0
YZP|Sandspit Airport|Sandspit|CA|53.25|-131.81|0
YZS|Coral Harbour Airport|Coral Harbour|CA|64.19|-83.36|0
YZT|Port Hardy Airport|Port Hardy|CA|50.68|-127.37|0
YZU|Whitecourt Airport|Whitecourt|CA|54.14|-115.79|0
YZV|Sept-Îles Airport|Sept-Îles|CA|50.22|-66.27|0
YZY|Zhangye Ganzhou Airport|Zhangye (Ganzhou)|CN|38.8|100.68|0
ZAL|Pichoy Airport|Valdivia|CL|-39.65|-73.09|0
ZAT|Zhaotong Zhaoyang Airport|Zhaotong|CN|27.21|103.69|0
ZBF|Bathurst Airport|South Tetagouche|CA|47.63|-65.74|0
ZBR|Chabahar Konarak International Airport|Konarak|IR|25.44|60.38|0
ZCL|General Leobardo C. Ruiz International Airport|Zacatecas|MX|22.89|-102.69|0
ZEL|Bella Bella (Campbell Island) Airport|Bella Bella|CA|52.19|-128.16|0
ZHY|Zhongwei Shapotou Airport|Zhongwei (Shapotou)|CN|37.57|105.15|0
ZIG|Ziguinchor Airport|Ziguinchor|SN|12.56|-16.28|0
ZIX|Zhigansk Airport|Zhigansk|RU|66.8|123.36|0
ZKP|Zyryanka Airport|Zyryanka|RU|65.75|150.89|0
ZLO|Playa de Oro International Airport|Manzanillo|MX|19.14|-104.56|0
ZMT|Masset Airport|Masset|CA|54.03|-132.12|0
ZND|Zinder Airport|Zinder|NE|13.78|8.98|0
ZNE|Newman Airport|Newman|AU|-23.42|119.8|0
ZOS|Cañal Bajo Carlos Hott Siebert Airport|Osorno|CL|-40.61|-73.06|0
ZQZ|Zhangjiakou Ningyuan Airport|Zhangjiakou|CN|40.74|114.93|0
ZSJ|Sandy Lake Airport|Sandy Lake|CA|53.06|-93.34|0
ZTH|Zakynthos International Airport Dionysios Solomos|Zakynthos|GR|37.75|20.88|0
ZYI|Zunyi Xinzhou Airport|Zunyi|CN|27.81|107.25|0
`;



let CACHE: Airport[] | null = null;

function all(): Airport[] {
  if (CACHE) return CACHE;
  CACHE = BLOB.split('\n').filter(Boolean).map(l => {
    const [iata, name, city, cc, lat, lng, big] = l.split('|');
    return { iata, name, city, cc, lat: +lat, lng: +lng, large: big === '1' };
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

/** Great-circle distance in km. Haversine — exact enough at these ranges, and
 *  the alternative (equirectangular) drifts badly near the poles for no gain
 *  at a table this small. */
function distanceKm(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

export type NearbyAirport = Airport & { km: number };

/**
 * The airports that plausibly serve a place, best first.
 *
 * WHY NOT JUST A RADIUS. Distance alone answers the wrong question. At 100km
 * New York returns eight, including Teterboro — a business-aviation field
 * nobody books a seat from — and Milan reaches Lugano, in a different country.
 * At a radius tight enough to exclude those, Tokyo loses Narita, which is 68km
 * out and the entire reason this feature exists.
 *
 * So: a generous radius, then RANKING. Large airports first, then distance,
 * then capped. That ordering puts Narita above Ibaraki for Tokyo and JFK above
 * Teterboro for New York without needing a radius that can serve both.
 *
 * Same country as the destination, because a picker offering another country's
 * airport is offering a border crossing without saying so — Lugano for Milan is
 * 63km and a different visa regime. Cross-border commutes exist (Basel, Geneva)
 * and this will occasionally be too strict; that is the safer direction to be
 * wrong in, and the traveller can still type the code by hand.
 */
export function nearbyAirports(
  lat: number, lng: number, cc?: string | null,
  { radiusKm = 100, limit = 4 }: { radiusKm?: number; limit?: number } = {},
): NearbyAirport[] {
  if (!isFinite(lat) || !isFinite(lng)) return [];
  const near: NearbyAirport[] = [];
  for (const a of all()) {
    if (cc && a.cc !== cc.toUpperCase()) continue;
    const km = distanceKm(lat, lng, a.lat, a.lng);
    if (km <= radiusKm) near.push({ ...a, km });
  }
  near.sort((x, y) => (x.large === y.large ? x.km - y.km : x.large ? -1 : 1));
  return near.slice(0, limit);
}
