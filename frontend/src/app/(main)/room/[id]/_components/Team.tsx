import styles from './team.module.css'
import useUserStore from '@/stores/userStore'

interface TeamGamers {
    colorId: number
    gamerId: string
    teamId: number
    nickname: string
}

interface TeamProps {
    team: {
        colorCode: string
        teamNumber: number
        teamGamers: TeamGamers[] | null[]
        ready: boolean
    }
    handleTeamClick: (teamNumber: number) => void;
}

export default function Team({ team, handleTeamClick }: TeamProps) {
    const { nickname } = useUserStore()

    // 투명도 조절
    const transparentColor = (color: string) => {
        return color.replace('1)', '0.5)')
    }
    // team이 비어있는지
    const IsEmptyTeam = team.teamGamers.length === 0 ? true : false

    // team이 준비 중인지
    const readyText = team.ready === true ? '준비 완료' : ''

    // 나의 팀
    const myTeam = nickname && team && team.teamGamers.some(gamer => gamer?.nickname === nickname) ? styles.myTeam : styles.team;

    return (
        <div className={IsEmptyTeam ? styles.noMember : myTeam} onClick={() => {
            if (!team.ready) { // 팀이 준비 상태가 아닐 때만 handleTeamDoubleClick 호출
                if (team.teamGamers.length >= 3) {
                    alert('이 팀은 이미 가득 찼습니다.');
                } else {
                    handleTeamClick(team.teamNumber);
                }
            } else {
                alert('이 팀은 이미 준비가 완료되었습니다.');
            }
        }}>
            <div className={styles.teamName}>Team {team.teamNumber}</div>
            <div className={styles.users}>
                {team.teamGamers.map((member, index) => (
                    <div className={styles.nickname}
                        key={index}
                        style={{ backgroundColor: member ? transparentColor(team.colorCode) : team.colorCode }}
                    >
                        {member?.nickname}
                    </div>
                ))}
            </div>
            {/* 비어있는 팀  */}
            {
                IsEmptyTeam && (
                    <div className={styles.ready}></div>
                )
            }
            {/* 준비완료 팀 */}
            {
                !IsEmptyTeam && team.ready === true && (
                    <div className={styles['ready-complete']}>준비 완료</div>
                )
            }
            {/* 준비중 팀 */}
            {
                !IsEmptyTeam && team.ready === false && (
                    <div className={styles.ready}>준비중</div>
                )
            }
        </div >
    )
}
