import {FC} from "react";
import {useTranslation} from "react-i18next";
import {Text} from "@chakra-ui/react";
import {relativeExpiryDate} from "utils/dateFormatter";

type UserStatusProps = {
    lastOnline: string | null;
};

const convertDateFormat = (lastOnline: string | null): number | null => {
    if (!lastOnline) {
        return null;
    }

    const date = new Date(lastOnline + "Z");
    return Math.floor(date.getTime() / 1000);
};

export const OnlineStatus: FC<UserStatusProps> = ({lastOnline}) => {
    const {t} = useTranslation();
    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
    const unixTime = convertDateFormat(lastOnline);

    const timeDifferenceInSeconds = unixTime ? currentTimeInSeconds - unixTime : null;
    const dateInfo = unixTime ? relativeExpiryDate(unixTime) : {status: "", time: t("lastOnline.never")};

    return (
        <Text
            display="inline-block"
            fontSize="xs"
            fontWeight="medium"
            ml="2"
            color="gray.600"
            _dark={{
                color: "gray.400",
            }}
        >
            {timeDifferenceInSeconds && timeDifferenceInSeconds <= 60
                ? t("lastOnline.now")
                : timeDifferenceInSeconds
                    ? t("lastOnline.ago", {time: dateInfo.time})
                    : dateInfo.time}
        </Text>
    );
};