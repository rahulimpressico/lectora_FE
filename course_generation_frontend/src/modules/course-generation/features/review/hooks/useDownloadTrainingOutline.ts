import { useCallback, useState } from 'react'
import { useCourseStore } from '../../../store/courseStore'
import { exportTrainingOutlineToDocx } from '../../../utils/exportTrainingOutline'

export function useDownloadTrainingOutline() {
  const {
    toData,
    courseTitle,
    audience,
    difficultyLevel,
    durationHours,
    wizardData,
  } = useCourseStore()

  const [downloading, setDownloading] = useState(false)

  const download = useCallback(async () => {
    if (!toData || downloading) return
    setDownloading(true)
    try {
      await exportTrainingOutlineToDocx(toData, {
        courseTitle,
        ruleFamily: (toData.rule_family as string | undefined) ?? '',
        audience,
        difficultyLevel,
        durationHours,
        description: wizardData.description || '',
        objectives: wizardData.objectives.length > 0 ? wizardData.objectives : undefined,
      })
    } catch (err) {
      console.error('Failed to generate Training Outline DOCX:', err)
    } finally {
      setDownloading(false)
    }
  }, [toData, downloading, courseTitle, audience, difficultyLevel, durationHours, wizardData])

  return { download, downloading }
}
