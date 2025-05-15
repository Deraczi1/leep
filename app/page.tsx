"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { pl } from "date-fns/locale"
import { CalendarIcon, Printer, FileText, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

interface CarDeparture {
  time: string
  name: string
  carModel: string
  paid: boolean
  garage: boolean
  flightInfo: string
  additionalInfo: string
  internalInfo: string // Nowe pole na informacje wewnętrzne
  garageNumber?: string
  paymentAmount?: string
}

interface DaySchedule {
  date: Date
  title: string
  departures: CarDeparture[]
}

export default function CarDepartureForm() {
  const [schedule, setSchedule] = useState<DaySchedule[]>([])
  const [date, setDate] = useState<Date | undefined>(new Date())
  const [time, setTime] = useState("")
  const [name, setName] = useState("")
  const [carModel, setCarModel] = useState("")
  const [flightInfo, setFlightInfo] = useState("")
  const [paid, setPaid] = useState(true)
  const [garage, setGarage] = useState(false)
  const [additionalInfo, setAdditionalInfo] = useState("")
  const [internalInfo, setInternalInfo] = useState("") // Nowy stan na informacje wewnętrzne
  const [garageNumber, setGarageNumber] = useState("")
  const [paymentAmount, setPaymentAmount] = useState("")
  const [combineSmallDays, setCombineSmallDays] = useState(false)
  const [carsThreshold, setCarsThreshold] = useState(3)
  const [bulkText, setBulkText] = useState("")
  const [parseResult, setParseResult] = useState<{ success: boolean; message: string }>({ success: true, message: "" })
  const [activeTab, setActiveTab] = useState("manual")
  const printRef = useRef<HTMLDivElement>(null)
  const [debugInfo, setDebugInfo] = useState<string>("")
  const [showDebug, setShowDebug] = useState(false)

  // Dodaj te stany po istniejących stanach
  const [apiSend, setApiSend] = useState(false)
  const [carBrand, setCarBrand] = useState("")
  const [carModelOnly, setCarModelOnly] = useState("")
  const [carNumber, setCarNumber] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [rating, setRating] = useState(0)
  const [nip, setNip] = useState("")
  const [dayCounter, setDayCounter] = useState(3)
  const [forListInfo, setForListInfo] = useState("")
  const [leftKey, setLeftKey] = useState(false)
  const [payInUsd, setPayInUsd] = useState(false)
  const [payInEur, setPayInEur] = useState(false)
  const [charger, setCharger] = useState(false)
  const [smallCar, setSmallCar] = useState(false)
  const [geogrid, setGeogrid] = useState(false)
  const [isTake, setIsTake] = useState(false)
  const [nipTake, setNipTake] = useState(false)

  // Dodaj stany dla dat przyjazdu i wyjazdu
  const [comeDate, setComeDate] = useState<Date | undefined>(new Date())
  const [comeTime, setComeTime] = useState("")
  const [leaveDate, setLeaveDate] = useState<Date | undefined>(new Date())
  const [leaveTime, setLeaveTime] = useState("")

  const getHolidayName = (date: Date): string => {
    const day = date.getDate()
    const month = date.getMonth() + 1

    // Przykładowe święta - można rozszerzyć
    if (day === 28 && month === 4) return "Światowy Dzień Pamięci Ofiar Wypadków przy Pracy"
    if (day === 29 && month === 4) return "Międzynarodowy Dzień Tańca"
    if (day === 30 && month === 4) return "Światowy Dzień Sprzeciwu wobec Bicia Dzieci"

    return ""
  }

  const clearForm = () => {
    setTime("")
    setName("")
    setCarModel("")
    setFlightInfo("")
    setPaid(true)
    setGarage(false)
    setAdditionalInfo("")
    setInternalInfo("") // Wyczyść informacje wewnętrzne
    setGarageNumber("")
    setPaymentAmount("")
    setDebugInfo("")

    // Czyszczenie nowych pól
    setCarBrand("")
    setCarModelOnly("")
    setCarNumber("")
    setPhone("")
    setEmail("")
    setRating(0)
    setNip("")
    setDayCounter(3)
    setForListInfo("")
    setLeftKey(false)
    setPayInUsd(false)
    setPayInEur(false)
    setCharger(false)
    setSmallCar(false)
    setGeogrid(false)
    setIsTake(false)
    setNipTake(false)

    // Czyszczenie dat przyjazdu i wyjazdu
    setComeDate(new Date())
    setComeTime("")
    setLeaveDate(new Date())
    setLeaveTime("")
  }

  const addDeparture = async () => {
    if (!date || !time || !name || !carModel || !flightInfo) {
      alert("Proszę wypełnić wszystkie wymagane pola!")
      return
    }

    if (!paid && !paymentAmount) {
      alert("Proszę podać kwotę do zapłaty!")
      return
    }

    const newDeparture: CarDeparture = {
      time,
      name,
      carModel,
      paid,
      garage,
      flightInfo,
      additionalInfo,
      internalInfo, // Dodaj informacje wewnętrzne
      garageNumber,
      paymentAmount: !paid ? paymentAmount : undefined,
    }

    // Konwersja daty i godziny na timestamp
    let comeTimestamp: number
    let leaveTimestamp: number

    // Jeśli mamy daty przyjazdu i wyjazdu, użyj ich
    if (comeDate && comeTime) {
      const [comeHours, comeMinutes] = comeTime.split(":").map(Number)
      const comeDateObj = new Date(comeDate)
      comeDateObj.setHours(comeHours, comeMinutes, 0, 0)
      comeTimestamp = comeDateObj.getTime()
    } else {
      // Fallback do daty wyjazdu
      const [hours, minutes] = time.split(":").map(Number)
      const departureDateObj = new Date(date)
      departureDateObj.setHours(hours, minutes, 0, 0)
      comeTimestamp = departureDateObj.getTime()
    }

    if (leaveDate && leaveTime) {
      const [leaveHours, leaveMinutes] = leaveTime.split(":").map(Number)
      const leaveDateObj = new Date(leaveDate)
      leaveDateObj.setHours(leaveHours, leaveMinutes, 0, 0)
      leaveTimestamp = leaveDateObj.getTime()
    } else {
      // Fallback - oblicz leave_time jako dayCounter dni później od comeTimestamp
      leaveTimestamp = comeTimestamp + dayCounter * 24 * 60 * 60 * 1000
    }

    // Budujemy payload dla API
    const payload = {
      id: crypto.randomUUID(),
      come_time: comeTimestamp,
      leave_time: leaveTimestamp,
      reservation_name: name,
      car_brand: carBrand || "",
      car_model: carModelOnly || "",
      car_number: carNumber || "",
      fly: JSON.stringify({ info: flightInfo }),
      for_us_info: internalInfo || "", // Używamy pola internalInfo
      for_list_info: additionalInfo || "", // Używamy pola additionalInfo dla listy
      garage: JSON.stringify({ number: garageNumber ? Number.parseInt(garageNumber) : 0 }),
      is_pay: paid ? 1 : 0,
      prize: !paid && paymentAmount ? Math.round(Number.parseFloat(paymentAmount)) : 0,
      create_time: Date.now(),
      last_edit_time: Date.now(),
      who_entered: "nextjs_ui",
      api_write: "departure_panel",
      phone: phone || "",
      email: email || "",
      nip: nip || "",
      rating: rating || 0,
      charger: charger ? 1 : 0,
      small_car: smallCar ? 1 : 0,
      geogrid: geogrid ? 1 : 0,
      day_counter: dayCounter || 3,
      left_key: leftKey ? 1 : 0,
      pay_in_usd: payInUsd ? 1 : 0,
      pay_in_eur: payInEur ? 1 : 0,
      surcharge: JSON.stringify({}),
      without_reservation: 1,
      delivery: JSON.stringify({}),
      is_take: isTake ? 1 : 0,
      nipTake: nipTake ? 1 : 0,
      web_site_reservation: 1,
    }

    try {
      // Wysyłaj dane do API tylko jeśli apiSend jest true
      if (apiSend) {
        const response = await fetch("https://7581-80-49-194-249.ngrok-free.app/add_reservation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        })

        if (!response.ok) {
          throw new Error(`Błąd serwera: ${response.status}`)
        }

        const result = await response.json()
        console.log("Rezerwacja wysłana, odpowiedź serwera:", result)
      } else {
        console.log("Tryb testowy - dane nie zostały wysłane do API:", payload)
      }

      // Aktualizujemy stan harmonogramu (jak w Twoim oryginalnym kodzie)
      const existingDayIndex = schedule.findIndex((day) => day.date.toDateString() === date.toDateString())

      if (existingDayIndex >= 0) {
        const updatedSchedule = [...schedule]
        updatedSchedule[existingDayIndex].departures.push(newDeparture)
        updatedSchedule[existingDayIndex].departures.sort((a, b) => a.time.localeCompare(b.time))
        setSchedule(updatedSchedule)
      } else {
        const newDay: DaySchedule = {
          date: new Date(date),
          title: getHolidayName(date),
          departures: [newDeparture],
        }

        const updatedSchedule = [...schedule, newDay].sort((a, b) => a.date.getTime() - b.date.getTime())
        setSchedule(updatedSchedule)
      }

      clearForm()
    } catch (error) {
      alert("Wystąpił błąd podczas wysyłania rezerwacji: " + error.message)
    }
  }

  const parseBulkText = () => {
    if (!bulkText.trim()) {
      setParseResult({
        success: false,
        message: "Proszę wprowadzić tekst do analizy.",
      })
      return
    }

    try {
      // Rozdziel tekst na linie i usuń puste linie
      const allLines = bulkText.trim().split("\n")
      const lines = allLines.filter((line) => line.trim() !== "")

      // Sprawdź, czy mamy wystarczającą liczbę linii
      if (lines.length < 3) {
        setParseResult({
          success: false,
          message: "Tekst jest zbyt krótki. Potrzebne są co najmniej 3 linie z danymi.",
        })
        return
      }

      // Pierwsza linia zawiera informacje o samochodzie i statusie płatności
      let carLine = lines[0]
      let carModel = ""
      let isPaid = true // Domyślnie zakładamy, że jest zapłacone
      let garageNumber = ""
      let amount = ""
      let daysCount = 3 // Domyślna wartość
      const keywordsFound = new Set<string>()

      // Sprawdź, czy linia zaczyna się od numeru w nawiasach kwadratowych [X]
      const garageNumberRegex = /^\[(\d+)\]/
      const garageNumberMatch = carLine.match(garageNumberRegex)

      if (garageNumberMatch && garageNumberMatch[1]) {
        garageNumber = garageNumberMatch[1]
        // Usuń numer z linii, aby nie przeszkadzał w dalszym parsowaniu
        carLine = carLine.replace(garageNumberRegex, "").trim()
      }

      // Sprawdź czy w linii jest informacja o liczbie dni (np. 12x)
      const daysRegex = /(\d+)x/i
      const daysMatch = carLine.match(daysRegex)
      if (daysMatch && daysMatch[1]) {
        daysCount = Number.parseInt(daysMatch[1], 10)
        // Nie usuwamy tego z linii, bo będzie usunięte później
      }

      // Sprawdź słowa kluczowe w linii samochodu
      const keywordsToCheck = [
        "klucze",
        "garaż",
        "ładowarki",
        "geokratka",
        "małe auto",
        "brak rezerwacji",
        "dowóz",
        "dowóz (1 strona)",
      ]

      keywordsToCheck.forEach((keyword) => {
        const regex = new RegExp(keyword, "i")
        if (regex.test(carLine)) {
          keywordsFound.add(keyword.toLowerCase())
          // Usuń słowo kluczowe z linii samochodu
          carLine = carLine.replace(regex, "").trim()
        }
      })

      // WAŻNE: Najpierw sprawdź status płatności, zanim zmodyfikujemy carLine
      const originalCarLine = carLine // Zachowaj oryginalną linię
      const carLineLower = originalCarLine.toLowerCase()

      // Sprawdź status płatności - najpierw sprawdź "do zapłaty"/"dz"
      if (
        carLineLower.includes("do zapłaty") ||
        carLineLower.includes(" dz") ||
        carLineLower.includes(" dz ") ||
        carLineLower.includes("dz ") ||
        carLineLower.match(/\bdz\b/) !== null
      ) {
        isPaid = false

        // Spróbuj wyciągnąć kwotę do zapłaty
        const amountRegex = /do zapłaty\s+(\d+(?:[.,]\d+)?)/i
        const amountMatch = originalCarLine.match(amountRegex)

        if (amountMatch && amountMatch[1]) {
          amount = Math.round(Number.parseFloat(amountMatch[1].replace(",", "."))).toString()
        }
      }
      // Jeśli nie znaleziono "do zapłaty", sprawdź "zapłacone"/"z"
      else if (
        carLineLower.includes("zapłacone") ||
        carLineLower.includes(" z") ||
        carLineLower.includes("zapłacono") ||
        carLineLower.includes(" z ") ||
        carLineLower.match(/\bz\b/) !== null
      ) {
        isPaid = true
      }

      // Dodaj informacje diagnostyczne
      let debugText = `Oryginalna linia: "${originalCarLine}"\n`
      debugText += `Linia małymi literami: "${carLineLower}"\n`
      debugText += `Status płatności: ${isPaid ? "Zapłacone (Z)" : "Do zapłaty (DZ)"}\n`

      if (!isPaid && amount) {
        debugText += `Kwota do zapłaty: ${amount} zł\n`
      }

      // Usuń informacje o płatności z modelu samochodu
      carModel = originalCarLine
        .replace(/\d+x\s*zapłacone/gi, "")
        .replace(/\d+x\s*Z/gi, "")
        .replace(/\d+x\s*zapłacono/gi, "")
        .replace(/\d+x\s*Do zapłaty\s*\d+(?:[.,]\d+)?/gi, "")
        .replace(/\d+x\s*Do zapłaty/gi, "")
        .replace(/\d+x\s*DZ/gi, "")
        .replace(/zapłacone/gi, "")
        .replace(/zapłacono/gi, "")
        .replace(/Do zapłaty\s*\d+(?:[.,]\d+)?/gi, "")
        .replace(/Do zapłaty/gi, "")
        .replace(/\s+Z$/gi, "")
        .replace(/\s+DZ$/gi, "")
        .replace(/\d+x/gi, "")
        .trim()

      // Rozdziel dane samochodu na markę, model i numer rejestracyjny
      // Nowa logika rozdzielania danych samochodu
      const carParts = carModel.split(/\s+/)

      if (carParts.length >= 2) {
        // Sprawdź, czy ostatni element wygląda jak numer rejestracyjny (zawiera cyfry i litery)
        const lastPart = carParts[carParts.length - 1]
        const isLicensePlate = /^[A-Z0-9]+$/i.test(lastPart)

        if (isLicensePlate) {
          // Mamy numer rejestracyjny
          setCarNumber(lastPart)

          // Pierwszy element to zawsze marka
          setCarBrand(carParts[0])

          // Jeśli mamy więcej niż 2 części, środkowe elementy to model
          if (carParts.length > 2) {
            setCarModelOnly(carParts.slice(1, carParts.length - 1).join(" "))
          } else {
            // Jeśli mamy tylko 2 części (markę i numer), model jest pusty
            setCarModelOnly("")
          }
        } else {
          // Nie mamy numeru rejestracyjnego
          setCarBrand(carParts[0])
          setCarModelOnly(carParts.slice(1).join(" "))
          setCarNumber("")
        }
      } else if (carParts.length === 1) {
        // Mamy tylko jedną część - zakładamy, że to marka
        setCarBrand(carParts[0])
        setCarModelOnly("")
        setCarNumber("")
      } else {
        // Pusty string
        setCarBrand("")
        setCarModelOnly("")
        setCarNumber("")
      }

      // Sprawdź słowa kluczowe w pozostałych liniach
      for (let i = 1; i < lines.length; i++) {
        keywordsToCheck.forEach((keyword) => {
          const regex = new RegExp(keyword, "i")
          if (regex.test(lines[i])) {
            keywordsFound.add(keyword.toLowerCase())
            // Usuń słowo kluczowe z linii
            lines[i] = lines[i].replace(regex, "").trim()
          }
        })
      }

      // Druga linia zawiera daty i godziny
      const dateLine = lines[1]

      // Nowa logika do wyciągania dat przyjazdu i wyjazdu
      // Format: "5 maja 2025, 02:30–16 maja 2025, 02:00"
      const dateTimeRegex =
        /(\d+)\s+([a-zA-Zżźćńółęąśź]+)\s+(\d{4}),\s+(\d{2}):(\d{2})–(\d+)\s+([a-zA-Zżźćńółęąśź]+)\s+(\d{4}),\s+(\d{2}):(\d{2})/i
      const dateTimeMatch = dateLine.match(dateTimeRegex)

      let arrivalDate: Date | undefined
      let arrivalTime = ""
      let departureDate: Date | undefined
      let departureTime = ""

      if (dateTimeMatch) {
        // Mapowanie polskich nazw miesięcy na numery
        const monthMap: { [key: string]: number } = {
          stycznia: 0,
          styczeń: 0,
          sty: 0,
          lutego: 1,
          luty: 1,
          lut: 1,
          marca: 2,
          marzec: 2,
          mar: 2,
          kwietnia: 3,
          kwiecień: 3,
          kwi: 3,
          kwie: 3,
          maja: 4,
          maj: 4,
          czerwca: 5,
          czerwiec: 5,
          cze: 5,
          lipca: 6,
          lipiec: 6,
          lip: 6,
          sierpnia: 7,
          sierpień: 7,
          sie: 7,
          września: 8,
          wrzesień: 8,
          wrz: 8,
          października: 9,
          październik: 9,
          paź: 9,
          paz: 9,
          listopada: 10,
          listopad: 10,
          lis: 10,
          grudnia: 11,
          grudzień: 11,
          gru: 11,
        }

        // Dane przyjazdu
        const arrivalDay = Number.parseInt(dateTimeMatch[1])
        const arrivalMonthName = dateTimeMatch[2].toLowerCase()
        const arrivalYear = Number.parseInt(dateTimeMatch[3])
        const arrivalHour = dateTimeMatch[4]
        const arrivalMinute = dateTimeMatch[5]

        // Dane wyjazdu
        const departureDay = Number.parseInt(dateTimeMatch[6])
        const departureMonthName = dateTimeMatch[7].toLowerCase()
        const departureYear = Number.parseInt(dateTimeMatch[8])
        const departureHour = dateTimeMatch[9]
        const departureMinute = dateTimeMatch[10]

        const arrivalMonthNum = monthMap[arrivalMonthName]
        const departureMonthNum = monthMap[departureMonthName]

        if (arrivalMonthNum !== undefined && departureMonthNum !== undefined) {
          arrivalDate = new Date(arrivalYear, arrivalMonthNum, arrivalDay)
          arrivalTime = `${arrivalHour}:${arrivalMinute}`

          departureDate = new Date(departureYear, departureMonthNum, departureDay)
          departureTime = `${departureHour}:${departureMinute}`
        }
      }

      // Jeśli nie udało się dopasować pełnego wzorca, spróbuj wyciągnąć tylko datę przyjazdu
      if (!arrivalDate) {
        const singleDateTimeRegex = /(\d+)\s+([a-zA-Zżźćńółęąśź]+)\s+(\d{4}),\s+(\d{2}):(\d{2})/i
        const singleDateMatch = dateLine.match(singleDateTimeRegex)

        if (singleDateMatch) {
          const day = Number.parseInt(singleDateMatch[1])
          const monthName = singleDateMatch[2].toLowerCase()
          const year = Number.parseInt(singleDateMatch[3])
          const hour = singleDateMatch[4]
          const minute = singleDateMatch[5]

          const monthMap: { [key: string]: number } = {
            stycznia: 0,
            styczeń: 0,
            sty: 0,
            lutego: 1,
            luty: 1,
            lut: 1,
            marca: 2,
            marzec: 2,
            mar: 2,
            kwietnia: 3,
            kwiecień: 3,
            kwi: 3,
            kwie: 3,
            maja: 4,
            maj: 4,
            czerwca: 5,
            czerwiec: 5,
            cze: 5,
            lipca: 6,
            lipiec: 6,
            lip: 6,
            sierpnia: 7,
            sierpień: 7,
            sie: 7,
            września: 8,
            wrzesień: 8,
            wrz: 8,
            października: 9,
            październik: 9,
            paź: 9,
            paz: 9,
            listopada: 10,
            listopad: 10,
            lis: 10,
            grudnia: 11,
            grudzień: 11,
            gru: 11,
          }

          const monthNum = monthMap[monthName]

          if (monthNum !== undefined) {
            arrivalDate = new Date(year, monthNum, day)
            arrivalTime = `${hour}:${minute}`

            // Oblicz datę wyjazdu na podstawie liczby dni
            departureDate = new Date(arrivalDate)
            departureDate.setDate(departureDate.getDate() + daysCount)
            departureTime = arrivalTime // Użyj tej samej godziny
          }
        }
      }

      if (!arrivalDate) {
        setParseResult({
          success: false,
          message: "Nie udało się rozpoznać daty przyjazdu.",
        })
        return
      }

      // Trzecia linia zawiera imię i nazwisko oraz numer telefonu
      // Znajdź linię z imieniem i nazwiskiem - szukamy linii z numerem telefonu
      let personName = ""
      let phoneNumber = ""

      // Szukamy linii z numerem telefonu (po drugiej linii)
      const phoneRegex = /(\d{3}\s+\d{3}\s+\d{3}|\+\d+)/
      let nameLineIndex = -1

      for (let i = 2; i < lines.length; i++) {
        const phoneMatch = lines[i].match(phoneRegex)
        if (phoneMatch && phoneMatch[1]) {
          nameLineIndex = i
          phoneNumber = phoneMatch[1].replace(/\s+/g, "")
          break
        }
      }

      // Jeśli znaleźliśmy linię z numerem telefonu
      if (nameLineIndex >= 0) {
        const nameLine = lines[nameLineIndex]
        const nameRegex = /([A-Za-zżźćńółęąśŻŹĆŃÓŁĘĄŚ\s]+)(?:\s+\d{3}\s+\d{3}\s+\d{3}|\s+\+\d+|\s*$)/
        const nameMatch = nameLine.match(nameRegex)

        if (nameMatch && nameMatch[1]) {
          personName = nameMatch[1].trim()
        } else {
          // Jeśli nie udało się dopasować wzorca, weź całą linię jako imię i nazwisko
          personName = nameLine.replace(phoneRegex, "").trim()
        }

        // Usuń linię z imieniem i nazwiskiem z listy linii
        lines.splice(nameLineIndex, 1)
      } else {
        // Jeśli nie znaleźliśmy linii z numerem telefonu, weź trzecią linię jako imię i nazwisko
        if (lines.length > 2) {
          personName = lines[2]
          // Usuń linię z imieniem i nazwiskiem z listy linii
          lines.splice(2, 1)
        }
      }

      // Pozostałe linie to informacje o locie/kierunku
      let flightInfo = ""

      // Zbierz wszystkie pozostałe linie (po usunięciu linii z samochodem, datą i imieniem)
      if (lines.length > 2) {
        flightInfo = lines.slice(2).join(" ").trim()
      }

      // Dodaj informacje diagnostyczne o przetwarzaniu linii
      debugText += `\nLinie po filtrowaniu pustych: ${lines.length}\n`
      debugText += `Imię i nazwisko: "${personName}"\n`
      if (phoneNumber) {
        debugText += `Telefon: ${phoneNumber}\n`
      }
      debugText += `Informacje o locie: "${flightInfo}"\n`

      // Sprawdź, czy w tekście jest informacja o fakturze i NIP
      let invoiceInfo = ""
      const nipRegex = /NIP:?(\d{10})/i
      const nipMatch = bulkText.match(nipRegex)

      if (nipMatch && nipMatch[1]) {
        setNip(nipMatch[1])
        invoiceInfo += `NIP: ${nipMatch[1]}`
      }

      if (bulkText.toLowerCase().includes("faktura")) {
        if (invoiceInfo) invoiceInfo += ", "
        invoiceInfo += "Faktura"
      }

      // Ustaw wartości w formularzu
      setDate(departureDate) // Data wyjazdu to data powrotu
      setTime(departureTime) // Godzina wyjazdu to godzina powrotu
      setName(personName)
      setCarModel(carModel)
      setFlightInfo(flightInfo)
      setPaid(isPaid)
      setGarageNumber(garageNumber)
      setPaymentAmount(amount) // Ustaw kwotę do zapłaty
      if (garageNumber) {
        setGarage(true) // Jeśli jest numer garażu, to zaznacz checkbox garażu
      }

      // Ustaw numer telefonu
      setPhone(phoneNumber)

      // Ustaw licznik dni
      setDayCounter(daysCount)

      // Ustaw flagi na podstawie znalezionych słów kluczowych
      setLeftKey(keywordsFound.has("klucze"))
      setCharger(keywordsFound.has("ładowarki"))
      setGeogrid(keywordsFound.has("geokratka"))
      setSmallCar(keywordsFound.has("małe auto"))

      // Ustaw dodatkowe informacje - wszystkie znalezione słowa kluczowe
      const additionalInfoArray = Array.from(keywordsFound)
      const additionalInfoText = additionalInfoArray.join(", ")

      // Rozdziel informacje na publiczne i wewnętrzne
      setAdditionalInfo(additionalInfoText) // Informacje dla listy
      setForListInfo(additionalInfoText) // Informacje dla listy

      // Ustaw informacje wewnętrzne (faktura, NIP)
      if (invoiceInfo) {
        setInternalInfo(invoiceInfo) // Informacje tylko dla nas
      }

      // Ustaw daty przyjazdu i wyjazdu
      setComeDate(arrivalDate)
      setComeTime(arrivalTime)
      setLeaveDate(departureDate)
      setLeaveTime(departureTime)

      setDebugInfo(debugText)

      setParseResult({
        success: true,
        message: "Tekst został pomyślnie przeanalizowany i dane zostały wprowadzone do formularza.",
      })

      // Wyczyść pole tekstowe
      setBulkText("")

      // Przełącz na zakładkę ręcznego wprowadzania
      setActiveTab("manual")
    } catch (error) {
      setParseResult({
        success: false,
        message: "Wystąpił błąd podczas analizy tekstu. Sprawdź format i spróbuj ponownie.",
      })
      setDebugInfo(`Błąd: ${error.message}`)
    }
  }

  const removeDeparture = (dayIndex: number, departureIndex: number) => {
    const updatedSchedule = [...schedule]
    updatedSchedule[dayIndex].departures.splice(departureIndex, 1)

    // Jeśli nie ma więcej wyjazdów w danym dniu, usuń cały dzień
    if (updatedSchedule[dayIndex].departures.length === 0) {
      updatedSchedule.splice(dayIndex, 1)
    }

    setSchedule(updatedSchedule)
  }

  const printSchedule = () => {
    if (printRef.current) {
      // Otwórz nowe okno do drukowania
      const printWindow = window.open("", "_blank")
      if (!printWindow) {
        alert("Nie można otworzyć okna drukowania. Sprawdź, czy blokada wyskakujących okienek jest wyłączona.")
        return
      }

      // Skopiuj style z bieżącej strony
      const styles = Array.from(document.styleSheets)
        .map((styleSheet) => {
          try {
            return Array.from(styleSheet.cssRules)
              .map((rule) => rule.cssText)
              .join("\n")
          } catch (e) {
            return ""
          }
        })
        .join("\n")

      // Przygotuj zawartość do drukowania
      const printContents = printRef.current.innerHTML

      // Ustaw zawartość nowego okna
      printWindow.document.open()
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Parking Blisko</title>
          <style>${styles}</style>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
            }
            .print-content {
              width: 100%;
            }
            @media print {
              body {
                padding: 0;
              }
              button {
                display: none;
              }
            }
          </style>
        </head>
        <body>
          <div class="print-content">${printContents}</div>
          <div style="text-align: center; margin-top: 20px;">
            <button onclick="window.print()">Drukuj</button>
            <button onclick="window.close()">Zamknij</button>
          </div>
        </body>
        </html>
      `)
      printWindow.document.close()
    }
  }

  const formatDateHeader = (date: Date) => {
    const day = date.getDate().toString().padStart(2, "0")
    const month = (date.getMonth() + 1).toString().padStart(2, "0")
    const dayName = format(date, "EEEE", { locale: pl }).substring(0, 3)
    return `${day}.${month} (${dayName})`
  }

  return (
    <div className="container mx-auto p-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4 p-4 border rounded-lg">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual">Ręczne wprowadzanie</TabsTrigger>
              <TabsTrigger value="bulk">Wklejanie tekstu</TabsTrigger>
            </TabsList>

            <TabsContent value="manual" className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Dodaj nowy wyjazd</h2>

              <div className="space-y-2">
                <Label htmlFor="name">Imię i nazwisko</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="np. Jan Kowalski"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="date">Data wyjazdu</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn("w-full justify-start text-left font-normal", !date && "text-muted-foreground")}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {date ? format(date, "dd.MM.yyyy", { locale: pl }) : "Wybierz datę"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar mode="single" selected={date} onSelect={setDate} locale={pl} />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-2">
                <Label htmlFor="time">Godzina odbioru</Label>
                <Input
                  id="time"
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="carModel">Marka, model i numer rejestracyjny</Label>
                <Input
                  id="carModel"
                  value={carModel}
                  onChange={(e) => setCarModel(e.target.value)}
                  placeholder="np. SKODA FABIA SMI12345"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dayCounter">Liczba dni</Label>
                <Input
                  id="dayCounter"
                  type="number"
                  min="1"
                  value={dayCounter}
                  onChange={(e) => setDayCounter(Number.parseInt(e.target.value) || 3)}
                  placeholder="np. 12"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="flightInfo">Numer lotu powrotnego i kierunek</Label>
                <Input
                  id="flightInfo"
                  value={flightInfo}
                  onChange={(e) => setFlightInfo(e.target.value)}
                  placeholder="np. DUBLIN FR 5346"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox id="paid" checked={paid} onCheckedChange={(checked) => setPaid(checked as boolean)} />
                <Label htmlFor="paid">Zapłacone (Z/DZ)</Label>
              </div>

              {!paid && (
                <div className="space-y-2 ml-6">
                  <Label htmlFor="paymentAmount">Kwota do zapłaty (zł)</Label>
                  <Input
                    id="paymentAmount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    placeholder="np. 150.00"
                    required
                  />
                </div>
              )}

              <div className="flex items-center space-x-2">
                <Checkbox id="garage" checked={garage} onCheckedChange={(checked) => setGarage(checked as boolean)} />
                <Label htmlFor="garage">Garaż</Label>
              </div>

              {garage && (
                <div className="space-y-2 ml-6">
                  <Label htmlFor="garageNumber">Numer garażu</Label>
                  <Input
                    id="garageNumber"
                    value={garageNumber}
                    onChange={(e) => setGarageNumber(e.target.value)}
                    placeholder="np. 12 (opcjonalnie)"
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="additionalInfo">Dodatkowe informacje (widoczne na liście)</Label>
                <Textarea
                  id="additionalInfo"
                  value={additionalInfo}
                  onChange={(e) => {
                    setAdditionalInfo(e.target.value)
                    setForListInfo(e.target.value) // Synchronizuj for_list_info z additionalInfo
                  }}
                  placeholder="Informacje widoczne na liście"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="internalInfo">Informacje wewnętrzne (tylko dla nas)</Label>
                <Textarea
                  id="internalInfo"
                  value={internalInfo}
                  onChange={(e) => setInternalInfo(e.target.value)}
                  placeholder="Informacje tylko dla personelu (np. faktura, NIP)"
                />
              </div>
            </TabsContent>

            <TabsContent value="bulk" className="space-y-4">
              <h2 className="text-xl font-semibold mb-4">Wklej tekst do analizy</h2>

              <div className="space-y-2">
                <Label htmlFor="bulkText">Wklej skopiowany tekst</Label>
                <Textarea
                  id="bulkText"
                  value={bulkText}
                  onChange={(e) => setBulkText(e.target.value)}
                  placeholder="NP. [12] Ford Mondeo OKL39353 12x zapłacone&#10;4 maja 2025, 00:15–14 maja 2025, 03:00&#10;Oleksandr Yankov 886 383 154&#10;Antalia 4M873"
                  className="min-h-[150px]"
                />
              </div>

              <Button onClick={parseBulkText} className="w-full">
                <FileText className="mr-2 h-4 w-4" />
                Analizuj tekst
              </Button>

              {parseResult.message && (
                <Alert variant={parseResult.success ? "default" : "destructive"}>
                  <AlertDescription>{parseResult.message}</AlertDescription>
                </Alert>
              )}
            </TabsContent>
          </Tabs>

          <div className="space-y-2 pt-4 border-t">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="combineSmallDays"
                checked={combineSmallDays}
                onCheckedChange={(checked) => setCombineSmallDays(checked as boolean)}
              />
              <Label htmlFor="combineSmallDays">Łącz dni z małą liczbą aut</Label>
            </div>

            {combineSmallDays && (
              <div className="flex items-center space-x-2">
                <Label htmlFor="carsThreshold">Próg liczby aut:</Label>
                <Input
                  id="carsThreshold"
                  type="number"
                  min="1"
                  max="10"
                  value={carsThreshold}
                  onChange={(e) => setCarsThreshold(Number.parseInt(e.target.value) || 3)}
                  className="w-20"
                />
              </div>
            )}
          </div>

          <div className="flex items-center space-x-2 pt-4 border-t">
            <Checkbox id="apiSend" checked={apiSend} onCheckedChange={(checked) => setApiSend(checked as boolean)} />
            <Label htmlFor="apiSend">Wysyłaj dane do API</Label>
          </div>

          <div className="flex space-x-2">
            <Button onClick={addDeparture} className="flex-1">
              Dodaj do listy
            </Button>
            <Button onClick={clearForm} variant="outline" className="flex-1">
              <Trash2 className="mr-2 h-4 w-4" />
              Wyczyść
            </Button>
          </div>

          {/* Karta z informacjami wewnętrznymi */}
          {internalInfo && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle>Informacje wewnętrzne</CardTitle>
              </CardHeader>
              <CardContent>
                <p>{internalInfo}</p>
              </CardContent>
            </Card>
          )}

          {/* Karta z informacjami diagnostycznymi */}
          {debugInfo && showDebug && (
            <Card className="mt-4 bg-gray-50">
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm">Informacje diagnostyczne</CardTitle>
                <Button variant="outline" size="sm" onClick={() => setShowDebug(!showDebug)} className="h-6 px-2">
                  Ukryj
                </Button>
              </CardHeader>
              <CardContent>
                <pre className="text-xs whitespace-pre-wrap">{debugInfo}</pre>
              </CardContent>
            </Card>
          )}

          {debugInfo && !showDebug && (
            <div className="mt-4">
              <Button variant="outline" size="sm" onClick={() => setShowDebug(!showDebug)} className="w-full">
                Pokaż informacje diagnostyczne
              </Button>
            </div>
          )}
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Lista wyjazdów</h2>
            <Button onClick={printSchedule} variant="outline">
              <Printer className="mr-2 h-4 w-4" />
              Drukuj
            </Button>
          </div>

          <div ref={printRef} className="print-content">
            {combineSmallDays ? (
              // Pogrupowane dni z małą liczbą aut
              <>
                {schedule
                  .filter((day) => day.departures.length <= carsThreshold)
                  .map((day, dayIndex) => (
                    <div key={`small-${dayIndex}`} className="mb-8">
                      <h3 className="text-xl font-bold text-center">{formatDateHeader(day.date)}</h3>
                      {day.title && <p className="text-center mb-2">{day.title}</p>}
                      <p className="text-center mb-4">Wyjeżdża: {day.departures.length}</p>

                      <div className="space-y-2">
                        {day.departures.map((departure, index) => (
                          <div key={index} className="flex flex-wrap items-center text-sm">
                            <div className="w-12 font-semibold">{departure.time}</div>
                            <div className="mx-2">{departure.name}</div>
                            <div className="mx-2">|</div>
                            <div className="mx-2">{departure.carModel}</div>
                            <div className="mx-2">|</div>
                            <div className="mx-2 font-bold">
                              {departure.paid
                                ? "Z"
                                : `DZ ${departure.paymentAmount ? Math.round(Number.parseFloat(departure.paymentAmount)) + " zł" : ""}`}
                            </div>
                            <div className="mx-2">|</div>
                            <div className="mx-2">{departure.flightInfo}</div>
                            {departure.garage && (
                              <>
                                <div className="mx-2">|</div>
                                <div className="mx-2 font-bold">
                                  Garaż: {departure.garageNumber ? ` [${departure.garageNumber}]` : ""}
                                </div>
                              </>
                            )}
                            {departure.additionalInfo && (
                              <>
                                <div className="mx-2">|</div>
                                <div className="mx-2">{departure.additionalInfo}</div>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const actualDayIndex = schedule.findIndex(
                                  (d) => d.date.toDateString() === day.date.toDateString(),
                                )
                                removeDeparture(actualDayIndex, index)
                              }}
                              className="ml-2 print:hidden"
                            >
                              ✕
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}

                {/* Dni z większą liczbą aut */}
                {schedule
                  .filter((day) => day.departures.length > carsThreshold)
                  .map((day, dayIndex) => (
                    <div key={`large-${dayIndex}`} className="mb-8">
                      <h3 className="text-xl font-bold text-center">{formatDateHeader(day.date)}</h3>
                      {day.title && <p className="text-center mb-2">{day.title}</p>}
                      <p className="text-center mb-4">Wyjeżdża: {day.departures.length}</p>

                      <div className="space-y-2">
                        {day.departures.map((departure, index) => (
                          <div key={index} className="flex flex-wrap items-center text-sm">
                            <div className="w-12 font-semibold">{departure.time}</div>
                            <div className="mx-2">{departure.name}</div>
                            <div className="mx-2">|</div>
                            <div className="mx-2">{departure.carModel}</div>
                            <div className="mx-2">|</div>
                            <div className="mx-2 font-bold">
                              {departure.paid
                                ? "Z"
                                : `DZ ${departure.paymentAmount ? Math.round(Number.parseFloat(departure.paymentAmount)) + " zł" : ""}`}
                            </div>
                            <div className="mx-2">|</div>
                            <div className="mx-2">{departure.flightInfo}</div>
                            {departure.garage && (
                              <>
                                <div className="mx-2">|</div>
                                <div className="mx-2 font-bold">
                                  Garaż: {departure.garageNumber ? ` [${departure.garageNumber}]` : ""}
                                </div>
                              </>
                            )}
                            {departure.additionalInfo && (
                              <>
                                <div className="mx-2">|</div>
                                <div className="mx-2">{departure.additionalInfo}</div>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                const actualDayIndex = schedule.findIndex(
                                  (d) => d.date.toDateString() === day.date.toDateString(),
                                )
                                removeDeparture(actualDayIndex, index)
                              }}
                              className="ml-2 print:hidden"
                            >
                              ✕
                            </Button>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
              </>
            ) : (
              // Standardowe wyświetlanie dni
              <>
                {schedule.map((day, dayIndex) => (
                  <div key={dayIndex} className="mb-8">
                    <h3 className="text-xl font-bold text-center">{formatDateHeader(day.date)}</h3>
                    {day.title && <p className="text-center mb-2">{day.title}</p>}
                    <p className="text-center mb-4">Wyjeżdża: {day.departures.length}</p>

                    <div className="space-y-2">
                      {day.departures.map((departure, index) => (
                        <div key={index} className="flex flex-wrap items-center text-sm">
                          <div className="w-12 font-semibold">{departure.time}</div>
                          <div className="mx-2">{departure.name}</div>
                          <div className="mx-2">|</div>
                          <div className="mx-2">{departure.carModel}</div>
                          <div className="mx-2">|</div>
                          <div className="mx-2 font-bold">
                            {departure.paid
                              ? "Z"
                              : `DZ ${departure.paymentAmount ? Math.round(Number.parseFloat(departure.paymentAmount)) + " zł" : ""}`}
                          </div>
                          <div className="mx-2">|</div>
                          <div className="mx-2">{departure.flightInfo}</div>
                          {departure.garage && (
                            <>
                              <div className="mx-2">|</div>
                              <div className="mx-2 font-bold">
                                Garaż: {departure.garageNumber ? ` [${departure.garageNumber}]` : ""}
                              </div>
                            </>
                          )}
                          {departure.additionalInfo && (
                            <>
                              <div className="mx-2">|</div>
                              <div className="mx-2 font-bold">{departure.additionalInfo}</div>
                            </>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeDeparture(dayIndex, index)}
                            className="ml-2 print:hidden"
                          >
                            ✕
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-content,
          .print-content * {
            visibility: visible;
          }
          .print-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
        }
      `}</style>
    </div>
  )
}
