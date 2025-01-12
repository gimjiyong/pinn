'use client'

import Chatting from '@/components/Chatting'
import LottieAnimation from '@/components/LottieAnimation'
import Timer from '@/components/Timer'
import themeStyles from '@/components/theme.module.css'
import useIngameStore from '@/stores/ingameStore'
import { Hint, RoundInit, StageTwoInit } from '@/types/IngameRestTypes'
import { GameProgressInfo } from '@/types/IngameSocketTypes'
import { getRoundInfo, getStageTwoHint } from '@/utils/IngameApi'
import { Loader } from '@googlemaps/js-api-loader'
import CountDown from '@public/assets/images/lotties/CountDown.json'
import { Client, IFrame, IMessage } from '@stomp/stompjs'
import { useRouter } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { FaEye, FaEyeSlash } from 'react-icons/fa6'
import { GiSoundOff, GiSoundOn } from 'react-icons/gi'
import GameInfo from './_components/GameInfo'
import Hints from './_components/Hints'
import IngameMap from './_components/IngameMap'
import StreetView from './_components/StreetView'
import ThemeInfo from './_components/ThemeInfo'
import styles from './game.module.css'

export default function GamePage({
  params,
}: {
  params: { gameId: string; round: string }
}) {
  const router = useRouter()

  // 요소 투명도 조절
  const [chatFocus, setChatFocus] = useState<boolean>(false)
  const [chatPin, setChatPin] = useState<boolean>(false)
  const [hintPin, setHintPin] = useState<boolean>(false)
  const [mapPin, setMapPin] = useState<boolean>(false)

  // 스테이지 넘김 애니메이션
  const [countDown, setCountDown] = useState<boolean>(false)
  const [stageTwoAni, setStageTwoAni] = useState<boolean>(false)

  // 힌트
  const [hints, setHints] = useState<Hint[] | null>(null)

  // 인게임 주스탠드
  const { theme, teamId } = useIngameStore()

  // 스테이지 시간 - 소켓으로 받아옴
  const [remainSeconds, setRemainSeconds] = useState<number>(30)
  const [currentStage, setCurrentStage] = useState<number>(1)

  // 정답 좌표
  const [lat, setLat] = useState<number>()
  const [lng, setLng] = useState<number>()

  // 사운드 토글
  const [soundOn, setSoundOn] = useState<boolean>(false)

  //구글맵
  const loader = new Loader({
    apiKey: process.env.NEXT_PUBLIC_GOOGLE_MAP_API_KEY as string,
    version: 'weekly',
  })

  // 채팅방 prop
  const chatTitle = '팀 채팅'
  const subscribeUrl = `/team/${params.gameId}/${teamId}`
  const publishUrl = `/app/team/chat`

  // 소켓 연결
  const clientRef = useRef<Client>(
    new Client({
      brokerURL: process.env.NEXT_PUBLIC_SERVER_SOCKET_URL,
      debug: function (str: string) {
        console.log(str)
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    }),
  )

  // 라운드 시작 정보 받아오기
  async function roundStartRender() {
    const roundInfo = (await getRoundInfo(
      params.gameId,
      params.round,
    )) as RoundInit
    // 라운드 받아오기 오류
    if (!roundInfo.success) {
      // alert(roundInfo.message)
      // 존재하지 않는 게임인 경우
      if (roundInfo.code == 3101) {
        router.push('/lobby')
      }
      return
    }
    setHints(roundInfo.result.hints)
    setLat(roundInfo.result.lat)
    setLng(roundInfo.result.lng)
  }

  // 스테이지 2 정보 받아오기
  async function stageTwoRender() {
    const stageTwoInfo = (await getStageTwoHint(
      params.gameId,
      params.round,
    )) as StageTwoInit
    if (!stageTwoInfo.success) {
      alert(stageTwoInfo.message)
      return
    }
    setCurrentStage(2)
    setHints(stageTwoInfo.result.hints)
  }

  // 소켓 구독
  const ingameSubscribeUrl = `/game/sse/${params.gameId}`
  useEffect(() => {
    // 게임 시작 정보

    // 라운드 시작 정보
    roundStartRender()

    // 소켓 연결 시 동작
    clientRef.current.onConnect = function (_frame: IFrame) {
      // 게임 진행 구독
      clientRef.current.subscribe(ingameSubscribeUrl, (message: IMessage) => {
        const gameProgressResponse = JSON.parse(
          message.body,
        ) as GameProgressInfo
        switch (gameProgressResponse.code) {
          case 1202:
            // 라운드 시작

            break
          case 1203:
            // 스테이지 2 렌더링
            stageTwoRender()
            // 스테이지 2 애니메이션
            setStageTwoAni(true)
            setTimeout(() => {
              setStageTwoAni(false)
            }, 600)
            break
          case 1204:
            // 스테이지 2 끝
            router.push(`/game/${params.gameId}/${params.round}/result`)
            break
          case 1210:
            // 현재 페이지와 라운드가 다를 경우
            if (gameProgressResponse.round != Number(params.round)) {
              router.push(
                `/game/${params.gameId}/${gameProgressResponse.round}`,
              )
              return
            }
            // 현재 스테이지가 다른 경우
            if (currentStage != gameProgressResponse.stage) {
              stageTwoRender()
            }
            if (gameProgressResponse.leftTime == 5) {
              setCountDown(true)
            }
            setRemainSeconds(gameProgressResponse.leftTime)
            break
        }
      })
    }

    clientRef.current.onStompError = function (frame: IFrame) {
      console.log('스톰프 에러: ' + frame.headers['message'])
      console.log('추가 정보: ' + frame.body)
    }

    clientRef.current.activate()

    return () => {
      clientRef.current.deactivate()
    }
  }, [params.gameId, params.round])

  function handleChatFocus(bool: boolean) {
    setChatFocus(bool)
  }

  // 사운드
  const hoverSound = () => {
    const audio = new Audio('/assets/sounds/hover.wav')
    if (soundOn) {
      audio.play()
    }
  }

  useEffect(() => {
    const audio = new Audio('/assets/sounds/lobby.mp3')
    audio.loop = true
    if (soundOn) {
      audio.play()
    } else {
      audio.pause()
    }

    return () => {
      audio.pause()
      audio.currentTime = 0
    }
  }, [soundOn])

  const backgroundSound = () => {
    setSoundOn((prev) => !prev)
  }

  return (
    <main>
      {countDown && (
        <div className={styles.lottieAnimation}>
          <div className={`${styles.lottieTitle} ${themeStyles[theme]}`}>
            현재 스테이지 종료까지
          </div>
          <LottieAnimation
            animationData={CountDown}
            play={countDown}
            loop={false}
            speed={1}
            setPlay={setCountDown}
          />
        </div>
      )}
      <div className={styles.infos}>
        <GameInfo
          theme={theme}
          round={Number(params.round)}
          stage={currentStage}
        />
        <ThemeInfo theme={theme} />
        {soundOn ? (
          <GiSoundOn className={styles.soundIcon} onClick={backgroundSound} />
        ) : (
          <GiSoundOff className={styles.soundIcon} onClick={backgroundSound} />
        )}
      </div>
      <div
        className={`${styles.hints} ${
          hintPin || stageTwoAni ? '' : styles.opacity
        } ${themeStyles[theme]} ${stageTwoAni ? styles.stageTwoWrapper : ''}`}
        onMouseEnter={hoverSound}
      >
        <div className={styles.pin} onClick={() => setHintPin((prev) => !prev)}>
          {!hintPin ? <FaEyeSlash /> : <FaEye />}
        </div>
        <Hints hints={hints} />
      </div>
      <div className={`${styles.timer} ${themeStyles[theme]}`}>
        <Timer remainSeconds={remainSeconds} />
      </div>
      <div
        className={`${styles.chat} ${
          chatFocus || chatPin ? '' : styles.opacity
        } ${themeStyles[theme]}`}
        onFocus={() => handleChatFocus(true)}
        onBlur={() => handleChatFocus(false)}
        onMouseEnter={hoverSound}
      >
        <div className={styles.pin} onClick={() => setChatPin((prev) => !prev)}>
          {!chatPin ? <FaEyeSlash /> : <FaEye />}
        </div>
        <Chatting
          chatTitle={chatTitle}
          subscribeUrl={subscribeUrl}
          publishUrl={publishUrl}
          gameId={params.gameId}
        />
      </div>
      <div className={`${styles.map} ${mapPin ? '' : styles.opacity}`}>
        <div
          className={`${styles.pin} ${styles.mapPin}`}
          onClick={() => setMapPin((prev) => !prev)}
        >
          {!mapPin ? <FaEyeSlash /> : <FaEye />}
        </div>
        <IngameMap
          theme={theme}
          loader={loader}
          gameId={params.gameId}
          round={params.round}
          stage={currentStage}
          soundOn={soundOn}
        />
      </div>
      <div className={styles.streetView}>
        <StreetView lat={lat!} lng={lng!} loader={loader} />
      </div>
    </main>
  )
}
