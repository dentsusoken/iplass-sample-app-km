/* Copyright 2026 DENTSU SOKEN INC. All Rights Reserved. */
package km.common.command;

import static km.common.command.CommandTestHelper.*;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

import km.common.dao.EntityDaoHelper;
import org.iplass.mtp.command.RequestContext;
import org.iplass.mtp.entity.EntityManager;
import org.iplass.mtp.entity.UpdateOption;
import org.iplass.mtp.test.AuthUser;
import org.iplass.mtp.test.MTPJUnitTestExtension;
import org.iplass.mtp.test.MTPTest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.MockedStatic;

@ExtendWith(MTPJUnitTestExtension.class)
@DisplayName("ChangeLanguageCommand")
class ChangeLanguageCommandTest {

	private ChangeLanguageCommand command;
	private RequestContext request;
	private EntityManager em;

	@BeforeEach
	void setUp() {
		command = new ChangeLanguageCommand();
		request = mock(RequestContext.class);
		em = mock(EntityManager.class);
	}

	@Test
	@AuthUser(userId = "testuser", password = "testuser")
	@DisplayName("対応言語を選ぶと現在ユーザーの language が更新される")
	void successUpdatesLanguage() {
		// AuthHelper は実コンテキストのまま使う（getCurrentUserOid が @AuthUser のユーザーを返すため）。
		// EntityManager 取得だけを差し替える。
		try (MockedStatic<EntityDaoHelper> dao = mockStatic(EntityDaoHelper.class)) {
			dao.when(EntityDaoHelper::getEntityManager).thenReturn(em);
			when(request.getParam("language")).thenReturn("en");

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("SUCCESS", result);
			// 標準 User エンティティの language プロパティのみが更新対象になっていること。
			verify(em)
					.update(
							argThat(e -> "mtp.auth.User".equals(e.getDefinitionName())
									&& "en".equals(e.getValue("language"))),
							any(UpdateOption.class));
		}
	}

	@Test
	@AuthUser(userId = "testuser", password = "testuser")
	@DisplayName("未対応の言語は VALIDATION_ERROR で更新しない")
	void errorWhenUnsupportedLanguage() {
		try (MockedStatic<EntityDaoHelper> dao = mockStatic(EntityDaoHelper.class)) {
			dao.when(EntityDaoHelper::getEntityManager).thenReturn(em);
			when(request.getParam("language")).thenReturn("fr");

			String result = MTPTest.invokeCommand(command, request);

			assertEquals("ERROR", result);
			verifyErrorResponse(request, "VALIDATION_ERROR");
			verify(em, never()).update(any(), any());
		}
	}
}
