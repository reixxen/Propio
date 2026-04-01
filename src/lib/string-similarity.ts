type FilterFunction = (text: string) => string

function compareTwoStrings(first: string, second: string): number {
  first = first.replace(/\s+/g, '')
  second = second.replace(/\s+/g, '')

  if (first === second) return 1
  if (first.length < 2 || second.length < 2) return 0

  const firstBigrams = new Map<string, number>()
  for (let i = 0; i < first.length - 1; i++) {
    const bigram = first.substring(i, i + 2)
    const count = firstBigrams.get(bigram) || 0
    firstBigrams.set(bigram, count + 1)
  }

  let intersectionSize = 0
  for (let i = 0; i < second.length - 1; i++) {
    const bigram = second.substring(i, i + 2)
    const count = firstBigrams.get(bigram) || 0

    if (count > 0) {
      firstBigrams.set(bigram, count - 1)
      intersectionSize++
    }
  }

  return (2.0 * intersectionSize) / (first.length + second.length - 2)
}

function findBestMatch(mainString: string, targetStrings: string[]) {
  if (
    typeof mainString !== 'string' ||
    !Array.isArray(targetStrings) ||
    targetStrings.length === 0
  ) {
    throw new Error('Bad arguments')
  }

  const ratings = targetStrings.map((target) => ({
    target,
    rating: compareTwoStrings(mainString, target),
  }))

  let bestMatchIndex = 0
  for (let i = 1; i < ratings.length; i++) {
    if (ratings[i]!.rating > ratings[bestMatchIndex]!.rating) {
      bestMatchIndex = i
    }
  }

  return {
    ratings,
    bestMatch: ratings[bestMatchIndex],
    bestMatchIndex,
  }
}

export const stringSimilarity = (filter: FilterFunction) => {
  return {
    compareTwoStrings: (first: string, second: string) => {
      return compareTwoStrings(filter(first), filter(second))
    },
    findBestMatch: (mainString: string, targetStrings: string[]) => {
      return findBestMatch(filter(mainString), targetStrings.map(filter))
    },
  }
}
