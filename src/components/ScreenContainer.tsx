import { SafeAreaView } from "react-native";
import { colors } from "../constants/colors";
export function ScreenContainer({ children }: React.PropsWithChildren) {
  return (
    <SafeAreaView style={{ backgroundColor: colors.paper, flex: 1 }}>
      {children}
    </SafeAreaView>
  );
}
