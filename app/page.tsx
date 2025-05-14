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

interface CarDeparture {
  time: string
  name: string
  carModel: string
  paid: boolean
  garage: boolean
  flightInfo: string
  additionalInfo: string
  garageNumber?: string
  paymentAmount?: string // Nowe pole na kwotę do zapłaty
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
  const [garageNumber, setGarageNumber] = useState("")
  const [paymentAmount, setPaymentAmount] = useState("") // Nowy stan na kwotę do zapłaty
  const [combineSmallDays, setCombineSmallDays] = useState(false)
  const [carsThreshold, setCarsThreshold] = useState(3)
  const [bulkText, setBulkText] = useState("")
  const [parseResult, setParseResult] = useState<{ success: boolean; message: string }>({ success: true, message: "" })
  const [activeTab, setActiveTab] = useState("manual")
  const printRef = useRef<HTMLDivElement>(null)

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
    setGarageNumber("")
    setPaymentAmount("") // Wyczyść kwotę do zapłaty
  }

  const addDeparture = () => {
    if (!date || !time || !name || !carModel || !flightInfo) {
      alert("Proszę wypełnić wszystkie wymagane pola!")
      return
    }
    if (!garage && !garageNumber) {
      alert("Proszę podać numer garażu!")
      return
    }
    // Sprawdź, czy kwota do zapłaty jest podana, gdy status to "Do zapłaty"
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
      garageNumber,
      paymentAmount: !paid ? paymentAmount : undefined, // Dodaj kwotę tylko gdy status to "Do zapłaty"
    }

    // Sprawdź czy istnieje już harmonogram na ten dzień
    const existingDayIndex = schedule.findIndex((day) => day.date.toDateString() === date.toDateString())

    if (existingDayIndex >= 0) {
      // Dodaj wyjazd do istniejącego dnia
      const updatedSchedule = [...schedule]
      updatedSchedule[existingDayIndex].departures.push(newDeparture)
      // Sortuj wyjazdy według czasu
      updatedSchedule[existingDayIndex].departures.sort((a, b) => a.time.localeCompare(b.time))
      setSchedule(updatedSchedule)
    } else {
      // Utwórz nowy dzień z wyjazdem
      const newDay: DaySchedule = {
        date: new Date(date),
        title: getHolidayName(date),
        departures: [newDeparture],
      }

      // Dodaj nowy dzień i posortuj dni według daty
      const updatedSchedule = [...schedule, newDay].sort((a, b) => a.date.getTime() - b.date.getTime())

      setSchedule(updatedSchedule)
    }

    // Wyczyść formularz
    clearForm()
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
      // Rozdziel tekst na linie
      const lines = bulkText.trim().split("\n")

      // Sprawdź, czy mamy wystarczającą liczbę linii
      if (lines.length < 3) {
        setParseResult({
          success: false,
          message: "Tekst jest zbyt krótki. Potrzebne są co najmniej 3 linie.",
        })
        return
      }

      // Pierwsza linia zawiera informacje o samochodzie i statusie płatności
      let carLine = lines[0]
      let carModel = ""
      let isPaid = false
      let garageNumber = ""
      let amount = ""

      // Sprawdź, czy linia zaczyna się od numeru w nawiasach kwadratowych [X]
      const garageNumberRegex = /^\[(\d+)\]/
      const garageNumberMatch = carLine.match(garageNumberRegex)

      if (garageNumberMatch && garageNumberMatch[1]) {
        garageNumber = garageNumberMatch[1]
        // Usuń numer z linii, aby nie przeszkadzał w dalszym parsowaniu
        carLine = carLine.replace(garageNumberRegex, "").trim()
      }

      // Sprawdź status płatności i wyciągnij kwotę do zapłaty jeśli jest
      if (carLine.includes("zapłacone") || carLine.includes(" Z") || carLine.includes("zapłacono")) {
        isPaid = true
      } else if (carLine.includes("Do zapłaty") || carLine.includes("DZ")) {
        isPaid = false

        // Spróbuj wyciągnąć kwotę do zapłaty
        const amountRegex = /Do zapłaty\s+(\d+(?:[.,]\d+)?)/i
        const amountMatch = carLine.match(amountRegex)

        if (amountMatch && amountMatch[1]) {
          amount = amountMatch[1].replace(",", ".")
        }
      } else {
        // Domyślnie zakładamy, że jest zapłacone
        isPaid = true
      }

      // Usuń informacje o płatności z modelu samochodu
      carModel = carLine
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

      // Druga linia zawiera daty i godziny (format: data wyjazdu, godzina–data powrotu, godzina)
      const dateLine = lines[1]

      // Wyciągnij datę i godzinę powrotu
      const returnRegex = /–(\d+)\s+([a-zA-Zżźćńółęąśź]+)\s+(\d{4}),\s+(\d{2}):(\d{2})/i
      const returnMatch = dateLine.match(returnRegex)

      let returnDate: Date | undefined
      let returnTime = ""

      if (returnMatch) {
        const returnDay = Number.parseInt(returnMatch[1])
        const returnMonthName = returnMatch[2].toLowerCase()
        const returnYear = Number.parseInt(returnMatch[3])
        const returnHour = returnMatch[4]
        const returnMinute = returnMatch[5]

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

        const returnMonthNum = monthMap[returnMonthName]

        if (returnMonthNum !== undefined) {
          returnDate = new Date(returnYear, returnMonthNum, returnDay)
          returnTime = `${returnHour}:${returnMinute}`
        }
      }

      // Jeśli nie znaleziono daty powrotu, spróbuj użyć daty wyjazdu jako fallback
      if (!returnDate) {
        const departureDateTimeRegex = /(\d+)\s+([a-zA-Zżźćńółęąśź]+)\s+(\d{4}),\s+(\d{2}):(\d{2})/i
        const departureDateMatch = dateLine.match(departureDateTimeRegex)

        if (departureDateMatch) {
          const day = Number.parseInt(departureDateMatch[1])
          const monthName = departureDateMatch[2].toLowerCase()
          const year = Number.parseInt(departureDateMatch[3])
          const hour = departureDateMatch[4]
          const minute = departureDateMatch[5]

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

          const monthNum = monthMap[monthName]

          if (monthNum !== undefined) {
            returnDate = new Date(year, monthNum, day)
            returnTime = `${hour}:${minute}`
          }
        }
      }

      if (!returnDate) {
        setParseResult({
          success: false,
          message: "Nie udało się rozpoznać daty powrotu.",
        })
        return
      }

      // Trzecia linia zawiera imię i nazwisko oraz numer telefonu
      const nameLine = lines[2]
      const nameRegex = /([A-Za-zżźćńółęąśŻŹĆŃÓŁĘĄŚ\s]+)(?:\s+\d{3}\s+\d{3}\s+\d{3}|\s+\+\d+|\s*$)/
      const nameMatch = nameLine.match(nameRegex)

      let personName = ""

      if (nameMatch && nameMatch[1]) {
        personName = nameMatch[1].trim()
      } else {
        // Jeśli nie udało się dopasować wzorca, weź całą linię jako imię i nazwisko
        personName = nameLine.trim()
      }

      // Czwarta i kolejne linie to informacje o locie/kierunku
      let flightInfo = ""
      if (lines.length > 3) {
        flightInfo = lines.slice(3).join(" ").trim()
      }

      // Ustaw wartości w formularzu
      setDate(returnDate)
      setTime(returnTime)
      setName(personName)
      setCarModel(carModel)
      setFlightInfo(flightInfo)
      setPaid(isPaid)
      setGarageNumber(garageNumber)
      setPaymentAmount(amount) // Ustaw kwotę do zapłaty
      if (garageNumber) {
        setGarage(true) // Jeśli jest numer garażu, to zaznacz checkbox garażu
      }

      // Nie dodawaj informacji o powrocie do dodatkowych informacji
      setAdditionalInfo("")

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
    const dayName = format(date, "(EEE)", { locale: pl })
    return `${day}.${month} ${dayName}`
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
                <Label htmlFor="additionalInfo">Dodatkowe informacje</Label>
                <Textarea
                  id="additionalInfo"
                  value={additionalInfo}
                  onChange={(e) => setAdditionalInfo(e.target.value)}
                  placeholder="Opcjonalne informacje"
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

          <div className="flex space-x-2">
            <Button onClick={addDeparture} className="flex-1">
              Dodaj do listy
            </Button>
            <Button onClick={clearForm} variant="outline" className="flex-1">
              <Trash2 className="mr-2 h-4 w-4" />
              Wyczyść
            </Button>
          </div>
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
                                : `DZ ${departure.paymentAmount ? departure.paymentAmount + " zł" : ""}`}
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
                                : `DZ ${departure.paymentAmount ? departure.paymentAmount + " zł" : ""}`}
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
                              : `DZ ${departure.paymentAmount ? departure.paymentAmount + " zł" : ""}`}
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
