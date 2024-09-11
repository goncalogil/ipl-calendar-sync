const buttonContainer = document.querySelector('[id="PlaceHolderMain_lblCurso"]').parentNode


const newButton = document.createElement('button');
newButton.innerText = 'Scrape'; // Set the text for the button

// Optionally, you can style the button
newButton.style.marginLeft = '10px'; // Adjust this as needed

// Insert the new button into the container, next to the existing buttons
if (buttonContainer) {
  buttonContainer.appendChild(newButton);

  // Optionally, add an event listener to the button
  newButton.addEventListener('click', handleSyncClick);
}

const currentStatus = localStorage.getItem('status')
const classesSet = new Set()
if (currentStatus === 'running') {
  iterateYears()
} else if (currentStatus === 'scraped') {
  Object.entries(localStorage).forEach(([key, value]) => localStorageToSet(key, value))
  const orderedClassesSet = Array.from(classesSet).sort((a, b) => a.year - b.year)

  const classesMultiSelector = document.createElement('select')
  classesMultiSelector.id = 'classesMultiSelector'
  classesMultiSelector.multiple = true

  orderedClassesSet.forEach((it) => {
    const option = document.createElement('option');
    option.value = `${it.year}-${it.className}`;
    option.text = `${it.year} - ${it.className}`;
    classesMultiSelector.appendChild(option);
  });
  buttonContainer.appendChild(classesMultiSelector)
}

function localStorageToSet(storageKey, storageValue) {
  let parts = storageKey.split('-');
  let classesIndex = parts.indexOf('classes');

  if (classesIndex == -1) {
    return
  }

  const year = parts[classesIndex + 1]

  const classes = JSON.parse(storageValue)
  for (let i = 0; i < classes.length; i++) {
    let classToInsert = {
      className: classes[i].className,
      year: year
    }

    if (!Array.from(classesSet).some(it => (it.year === classToInsert.year && it.className === classToInsert.className))) {
      classesSet.add(classToInsert)
    }
  }
}

function handleSyncClick(event) {
  event.preventDefault();
  localStorage.setItem('status', 'running')
  iterateYears()
}

function iterateYears() {
  const yearSelector = document.getElementById('PlaceHolderMain_ddlAnosCurr')
  const selectedYear = yearSelector.value
  const scrapedYears = JSON.parse(localStorage.getItem('scraped-years') ?? "[]")

  if (!scrapedYears.includes(selectedYear)) {
    iterateWeeks(selectedYear)
  }

  const missingYear = [...yearSelector.children].find(it => !scrapedYears.includes(it.value))
  if (!missingYear) {
    localStorage.setItem('status', 'scraped')
    return
  }

  yearSelector.value = missingYear.value
  yearSelector.dispatchEvent(new Event('change'), { bubbles: true })
}
function iterateWeeks(year) {
  const weekSelector = document.getElementById('PlaceHolderMain_ddlSemanas')
  const selectedWeek = weekSelector.value
  const selectedWeekSavedClasses = localStorage.getItem(`${selectedWeek}-classes`)
  if (!selectedWeekSavedClasses) {
    scrapeWeek(selectedWeek, year)
  }

  // Children is an HTML collection - Changin to array
  const missingWeek = [...weekSelector.children].find(it => !localStorage.getItem(`${it.value}-classes-${year}`))
  if (!missingWeek) {
    const storageScrapedYears = localStorage.getItem('scraped-years')
    const scrapedYears = storageScrapedYears ? JSON.parse(storageScrapedYears) : []
    scrapedYears.push(year)
    localStorage.setItem('scraped-years', JSON.stringify(scrapedYears))
    return
  }
  weekSelector.value = missingWeek.value
  weekSelector.dispatchEvent(new Event('change'), { bubbles: true })
}

function scrapeWeek(weekValue, yearValue) {
  const scrapedClasses = []
  const days = document.querySelector('[id="PlaceHolderMain_DayPilotCalendar1_events"]').childNodes
  days.forEach(day => {
    const date = new Date(day.getAttribute("dpcolumndate"))
    day.firstChild.childNodes.forEach(it => {
      const classInfo = getClassesInfo(it, date)
      scrapedClasses.push(classInfo)
    })
  })

  scrapedClasses.forEach(it => console.log(it))
  localStorage.setItem(`${weekValue}-classes-${yearValue}`, JSON.stringify(scrapedClasses));
}

function getClassesInfo(classNode, columnDate) {
  // Get Class Time
  const timePixels = parseInt(classNode.style['top'].split('px')[0]) - 1
  const durationPixels = parseInt(classNode.style['height'].split('px')[0])

  const pixelsToMilliSecondsConstant = (30 / 20) * 60 * 1000
  const startTimeOffset = 8 * 60 * 60 * 1000 // Day starts at 8h00 in table

  const duration = durationPixels * pixelsToMilliSecondsConstant
  const starTimeDelta = timePixels * pixelsToMilliSecondsConstant
  const startTime = new Date(columnDate.getTime() + startTimeOffset + starTimeDelta)
  const endTime = new Date(startTime.getTime() + duration)

  // Get Class Info
  const classInfo = classNode.innerText.split(' - ')

  return {
    startTime,
    endTime,
    className: classInfo[0],
    room: classInfo[3],
    professor: classInfo[1]
  }
}
